import * as maplibregl from "https://unpkg.com/maplibre-gl@^6.11.2/dist/maplibre-gl.mjs";

const ONG_CENTER = [-46.6691999, -23.4720956];
const RADIUS_KM = 3;

const map = new maplibregl.Map({
  container: "map",
  style: {
    version: 8,
    sources: {
      "osm-raster": {
        type: "raster",
        tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
        tileSize: 256,
        attribution: "© OpenStreetMap contributors"
      }
    },
    layers: [
      {
        id: "osm-raster",
        type: "raster",
        source: "osm-raster",
        minzoom: 0,
        maxzoom: 19
      }
    ]
  },
  center: ONG_CENTER,
  zoom: 13.35,
  minZoom: 11.6,
  maxZoom: 17.5,
  pitchWithRotate: false,
  dragRotate: false,
  attributionControl: true
});

const categoryLabels = {
  todos: "Todos",
  apoio_mulher: "Apoio à mulher",
  saude: "Saúde",
  seguranca: "Proteção e segurança",
  assistencia: "Assistência social",
  saude_mental: "Saúde mental"
};

const categorySymbols = {
  apoio_mulher: "♥",
  saude: "+",
  seguranca: "!",
  assistencia: "↔",
  saude_mental: "●"
};

map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-left");
map.addControl(new maplibregl.ScaleControl({ maxWidth: 110, unit: "metric" }), "bottom-left");

const markers = [];
let activeCategory = "todos";

const details = {
  panel: document.getElementById("details-panel"),
  category: document.getElementById("details-category"),
  name: document.getElementById("details-name"),
  description: document.getElementById("details-description"),
  address: document.getElementById("details-address"),
  hours: document.getElementById("details-hours"),
  contact: document.getElementById("details-contact"),
  note: document.getElementById("details-note")
};

document.getElementById("close-details").addEventListener("click", () => {
  details.panel.style.display = "none";
});

document.getElementById("reset-view").addEventListener("click", () => {
  map.flyTo({ center: ONG_CENTER, zoom: 13.35, essential: true });
});

document.querySelectorAll(".filter-chip").forEach((button) => {
  button.addEventListener("click", () => {
    activeCategory = button.dataset.category;

    document.querySelectorAll(".filter-chip").forEach((item) => {
      item.classList.toggle("active", item === button);
    });

    applyFilter();
  });
});

function applyFilter() {
  let count = 0;

  markers.forEach(({ element, feature }) => {
    if (feature.properties.kind === "ong") {
      element.classList.remove("hidden");
      return;
    }

    const visible =
      activeCategory === "todos" ||
      feature.properties.category === activeCategory;

    element.classList.toggle("hidden", !visible);
    if (visible) count += 1;
  });

  document.getElementById("visible-count").textContent = String(count);
}

function showDetails(feature) {
  const p = feature.properties;

  details.panel.style.display = "block";
  details.category.textContent =
    p.kind === "ong" ? "Ponto central" : categoryLabels[p.category] || "Serviço";
  details.name.textContent = p.name;
  details.description.textContent = p.description || "Informações do serviço.";
  details.address.textContent = p.address || "Não informado";
  details.hours.textContent = p.hours || "Confirmar com a instituição";
  details.contact.textContent = p.contact || "Não informado";

  details.note.textContent =
    p.kind === "ong"
      ? "A Nova Mulher é o ponto de referência central deste mapa."
      : "Coordenada usada neste protótipo é aproximada, baseada no logradouro/CEP. Validar o ponto exato antes da publicação final.";
}

function createMarker(feature) {
  const p = feature.properties;
  const element = document.createElement("button");

  element.type = "button";
  element.className =
    p.kind === "ong"
      ? "marker ong"
      : `marker ${p.category}`;

  element.setAttribute("aria-label", `Abrir detalhes de ${p.name}`);
  element.textContent = p.kind === "ong" ? "★" : (categorySymbols[p.category] || "•");

  element.addEventListener("click", (event) => {
    event.stopPropagation();
    showDetails(feature);
  });

  new maplibregl.Marker({ element, anchor: "center" })
    .setLngLat(feature.geometry.coordinates)
    .addTo(map);

  markers.push({ element, feature });
}

function destinationPoint([lng, lat], distanceKm, bearingDeg) {
  const radiusEarth = 6371;
  const bearing = bearingDeg * Math.PI / 180;
  const d = distanceKm / radiusEarth;
  const lat1 = lat * Math.PI / 180;
  const lng1 = lng * Math.PI / 180;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(d) +
    Math.cos(lat1) * Math.sin(d) * Math.cos(bearing)
  );

  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(bearing) * Math.sin(d) * Math.cos(lat1),
      Math.cos(d) - Math.sin(lat1) * Math.sin(lat2)
    );

  return [lng2 * 180 / Math.PI, lat2 * 180 / Math.PI];
}

function circlePolygon(center, radiusKm, steps = 128) {
  const ring = [];
  for (let i = 0; i <= steps; i++) {
    ring.push(destinationPoint(center, radiusKm, (i / steps) * 360));
  }
  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "Polygon",
      coordinates: [ring]
    }
  };
}

function outerMask(center, innerRadiusKm, outerRadiusKm = 8, steps = 128) {
  const outer = [];
  const inner = [];

  for (let i = 0; i <= steps; i++) {
    outer.push(destinationPoint(center, outerRadiusKm, (i / steps) * 360));
  }

  for (let i = steps; i >= 0; i--) {
    inner.push(destinationPoint(center, innerRadiusKm, (i / steps) * 360));
  }

  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "Polygon",
      coordinates: [outer, inner]
    }
  };
}

map.on("load", async () => {
  map.addSource("study-area", {
    type: "geojson",
    data: circlePolygon(ONG_CENTER, RADIUS_KM)
  });

  map.addLayer({
    id: "study-area-fill",
    type: "fill",
    source: "study-area",
    paint: {
      "fill-color": "#77205f",
      "fill-opacity": 0.02
    }
  });

  map.addLayer({
    id: "study-area-line",
    type: "line",
    source: "study-area",
    paint: {
      "line-color": "#77205f",
      "line-width": 2,
      "line-opacity": 0.45,
      "line-dasharray": [2, 2]
    }
  });

  map.addSource("outside-mask", {
    type: "geojson",
    data: outerMask(ONG_CENTER, RADIUS_KM)
  });

  map.addLayer({
    id: "outside-mask-fill",
    type: "fill",
    source: "outside-mask",
    paint: {
      "fill-color": "#f5f2f3",
      "fill-opacity": 0.18
    }
  });

  const response = await fetch("./data/locais.geojson");
  const geojson = await response.json();

  geojson.features.forEach(createMarker);
  applyFilter();

  const bounds = new maplibregl.LngLatBounds();
  circlePolygon(ONG_CENTER, RADIUS_KM).geometry.coordinates[0].forEach((coord) => bounds.extend(coord));
  map.fitBounds(bounds, { padding: 52, duration: 0, maxZoom: 14 });

  const ongFeature = geojson.features.find((feature) => feature.properties.kind === "ong");
  if (ongFeature) showDetails(ongFeature);
});
