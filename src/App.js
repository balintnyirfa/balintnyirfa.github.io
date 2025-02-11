import React, { useState, useEffect } from "react";

const Table = ({ rows, cols, images }) => {
  return (
    <div
      className="grid"
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gridTemplateRows: `repeat(${rows}, 1fr)`,
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
      }}
    >
      {Array.from({ length: rows }).map((_, x) =>
        Array.from({ length: cols }).map((_, y) => {
          const key = `${x}-${y}`;
          const cellData = images[key];
          // Ha van érvényes kép, azt jelenítjük meg, különben "No Image" vagy 204-es kód
          const hasImage = cellData && cellData.success && cellData.src;
          // A cella alján lévő sáv színe: zöld, ha van kép, egyébként piros
          const statusColor = hasImage ? "green" : "red";

          return (
            <div
              key={key}
              style={{
                border: "1px solid black",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
              }}
            >
              {hasImage ? (
                <img
                  src={cellData.src}
                  alt={`QR (${x}, ${y})`}
                  style={{ width: "80%", objectFit: "cover" }}
                />
              ) : (
                <span>
                  {cellData && cellData.status === 204
                    ? cellData.status
                    : "No Image"}
                </span>
              )}

              {/* Státuszkód megjelenítése a cella bal felső sarkában */}
              {cellData && cellData.status && (
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    backgroundColor: "rgba(255, 255, 255, 0.8)",
                    padding: "2px 4px",
                    fontSize: "0.8rem",
                  }}
                >
                  {cellData.status}
                </div>
              )}

              {/* Állapotcsík a cella alján */}
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  width: "100%",
                  height: "5px",
                  backgroundColor: statusColor,
                }}
              />
            </div>
          );
        })
      )}
    </div>
  );
};

const App = () => {
  const [rows, setRows] = useState(0);
  const [cols, setCols] = useState(0);
  // Az "images" objektum minden cellára: { src, success, status }
  const [images, setImages] = useState({});

  // Konfiguráció (sorok és oszlopok) lekérése a config.json-ból
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch("/config.json");
        const config = await response.json();
        setRows(config.rows);
        setCols(config.cols);
      } catch (error) {
        console.error("Hiba a konfiguráció lekérésekor:", error);
      }
    };
    fetchConfig();
  }, []);

  // Képek lekérése 5 másodpercenként
  useEffect(() => {
    if (rows === 0 || cols === 0) return;

    const fetchData = async () => {
      const newImages = {};
      const fetchPromises = [];

      for (let x = 0; x < rows; x++) {
        for (let y = 0; y < cols; y++) {
          const key = `${x}-${y}`;
          const url = `/image?x=${x}&y=${y}`;
          // Minden cellára elküldünk egy GET kérést
          const promise = fetch(url)
            .then((res) => {
              const status = res.status;
              if (status === 204) {
                // Ha 204-es választ kapunk, nem várunk JSON-t, hanem azonnal visszatérünk
                return { data: null, status };
              }
              return res.json().then((data) => ({ data, status }));
            })
            .then(({ data, status }) => {
              if (data && data.img) {
                newImages[key] = {
                  src: `data:image/png;base64,${data.img}`,
                  success: true,
                  status: status,
                };
              } else {
                newImages[key] = { success: false, status: status };
              }
            })
            .catch(() => {
              newImages[key] = { success: false, status: 404 };
            });
          fetchPromises.push(promise);
        }
      }

      await Promise.all(fetchPromises);
      // Az új eredményekkel frissítjük az "images" állapotot, így a felület újrarenderelődik
      setImages(newImages);
    };

    // Első lekérés azonnal
    fetchData();
    // Majd 5 másodpercenként új lekérés
    const intervalId = setInterval(fetchData, 5000);
    return () => clearInterval(intervalId);
  }, [rows, cols]);

  return (
    <div>
      <Table rows={rows} cols={cols} images={images} />
    </div>
  );
};

export default App;
