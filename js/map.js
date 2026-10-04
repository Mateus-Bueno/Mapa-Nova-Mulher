import * as maplibregl from "https://unpkg.com/maplibre-gl@^6.11.2/dist/maplibre-gl.mjs";

const ONG_CENTER = [-46.668313273753355, -23.473027172449523];
const RADIUS_OPTIONS = [3, 10];
let currentRadiusKm = 3;

const isMobile = window.matchMedia("(max-width: 780px)").matches;

const map = new maplibregl.Map({
  container: "map",
  cooperativeGestures: isMobile,
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
  minZoom: 9.5,
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

map.addControl(
  new maplibregl.NavigationControl({ showCompass: false }),
  "bottom-left"
);

map.addControl(
  new maplibregl.ScaleControl({
    maxWidth: 110,
    unit: "metric"
  }),
  "bottom-left"
);

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

const radiusToggle = document.getElementById("radius-toggle");
const radius3Label = document.getElementById("radius-3-label");
const radius10Label = document.getElementById("radius-10-label");

document
  .getElementById("close-details")
  .addEventListener("click", () => {
    details.panel.style.display = "none";
  });

document
  .getElementById("reset-view")
  .addEventListener("click", () => {
    fitMapToRadius(currentRadiusKm, true);
  });

radiusToggle.addEventListener("change", () => {
  currentRadiusKm = radiusToggle.checked ? 10 : 3;

  radiusToggle.setAttribute(
    "aria-checked",
    String(radiusToggle.checked)
  );

  radius3Label.classList.toggle(
    "active",
    currentRadiusKm === 3
  );

  radius10Label.classList.toggle(
    "active",
    currentRadiusKm === 10
  );

  updateStudyArea();
  applyFilter();
  fitMapToRadius(currentRadiusKm, true);
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

function haversineDistanceKm([lng1, lat1], [lng2, lat2]) {
  const toRad = (degrees) => degrees * Math.PI / 180;

  const earthRadiusKm = 6371;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) ** 2;

  return (
    2 *
    earthRadiusKm *
    Math.asin(Math.sqrt(a))
  );
}

function applyFilter() {
  let count = 0;

  markers.forEach(({ element, feature }) => {
    if (feature.properties.kind === "ong") {
      element.classList.remove("hidden");
      return;
    }

    const insideRadius =
      haversineDistanceKm(
        ONG_CENTER,
        feature.geometry.coordinates
      ) <= currentRadiusKm;

    const matchesCategory =
      activeCategory === "todos" ||
      feature.properties.category === activeCategory;

    const visible =
      insideRadius && matchesCategory;

    element.classList.toggle(
      "hidden",
      !visible
    );

    if (visible) {
      count += 1;
    }
  });

  document.getElementById(
    "visible-count"
  ).textContent = String(count);
}

function showDetails(feature) {
  const p = feature.properties;

  details.panel.style.display = "block";

  details.category.textContent =
    p.kind === "ong"
      ? "Ponto central"
      : categoryLabels[p.category] || "Serviço";

  details.name.textContent = p.name;

  details.description.textContent =
    p.description || "Informações do serviço.";

  details.address.textContent =
    p.address || "Não informado";

  details.hours.textContent =
    p.hours || "Confirmar com a instituição";

  details.contact.textContent =
    p.contact || "Não informado";

  details.note.textContent =
    p.kind === "ong"
      ? "A Nova Mulher é o ponto de referência central deste mapa."
      : "Coordenada usada neste protótipo é aproximada, baseada no logradouro/CEP. Validar o ponto exato antes da publicação final.";
}

function createMarker(feature) {
  const p = feature.properties;

  const element =
    document.createElement("button");

  element.type = "button";

  element.className =
    p.kind === "ong"
      ? "marker ong"
      : `marker ${p.category}`;

  element.setAttribute(
    "aria-label",
    `Abrir detalhes de ${p.name}`
  );

  element.textContent =
    p.kind === "ong"
      ? "★"
      : categorySymbols[p.category] || "•";

  element.addEventListener(
    "click",
    (event) => {
      event.stopPropagation();
      showDetails(feature);
    }
  );

  new maplibregl.Marker({
    element,
    anchor: "center"
  })
    .setLngLat(feature.geometry.coordinates)
    .addTo(map);

  markers.push({
    element,
    feature
  });
}

function destinationPoint(
  [lng, lat],
  distanceKm,
  bearingDeg
) {
  const radiusEarth = 6371;

  const bearing =
    bearingDeg * Math.PI / 180;

  const d =
    distanceKm / radiusEarth;

  const lat1 =
    lat * Math.PI / 180;

  const lng1 =
    lng * Math.PI / 180;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(d) +
    Math.cos(lat1) *
      Math.sin(d) *
      Math.cos(bearing)
  );

  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(bearing) *
        Math.sin(d) *
        Math.cos(lat1),
      Math.cos(d) -
        Math.sin(lat1) *
        Math.sin(lat2)
    );

  return [
    lng2 * 180 / Math.PI,
    lat2 * 180 / Math.PI
  ];
}

function circlePolygon(
  center,
  radiusKm,
  steps = 128
) {
  const ring = [];

  for (
    let i = 0;
    i <= steps;
    i++
  ) {
    ring.push(
      destinationPoint(
        center,
        radiusKm,
        (i / steps) * 360
      )
    );
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

function outerMask(
  center,
  innerRadiusKm,
  outerRadiusKm = Math.max(
    18,
    innerRadiusKm + 8
  ),
  steps = 128
) {
  const outer = [];
  const inner = [];

  for (
    let i = 0;
    i <= steps;
    i++
  ) {
    outer.push(
      destinationPoint(
        center,
        outerRadiusKm,
        (i / steps) * 360
      )
    );
  }

  for (
    let i = steps;
    i >= 0;
    i--
  ) {
    inner.push(
      destinationPoint(
        center,
        innerRadiusKm,
        (i / steps) * 360
      )
    );
  }

  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "Polygon",
      coordinates: [
        outer,
        inner
      ]
    }
  };
}

function fitMapToRadius(
  radiusKm,
  animated = false
) {
  const bounds =
    new maplibregl.LngLatBounds();

  circlePolygon(
    ONG_CENTER,
    radiusKm
  )
    .geometry
    .coordinates[0]
    .forEach((coord) => {
      bounds.extend(coord);
    });

  map.fitBounds(bounds, {
    padding: isMobile ? 30 : 52,
    duration: animated ? 650 : 0,
    maxZoom: 14
  });
}

function updateStudyArea() {
  const studyAreaSource =
    map.getSource("study-area");

  const outsideMaskSource =
    map.getSource("outside-mask");

  if (studyAreaSource) {
    studyAreaSource.setData(
      circlePolygon(
        ONG_CENTER,
        currentRadiusKm
      )
    );
  }

  if (outsideMaskSource) {
    outsideMaskSource.setData(
      outerMask(
        ONG_CENTER,
        currentRadiusKm
      )
    );
  }
}

map.on("load", async () => {
  map.addSource(
    "study-area",
    {
      type: "geojson",
      data: circlePolygon(
        ONG_CENTER,
        currentRadiusKm
      )
    }
  );

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

  map.addSource(
    "outside-mask",
    {
      type: "geojson",
      data: outerMask(
        ONG_CENTER,
        currentRadiusKm
      )
    }
  );

  map.addLayer({
    id: "outside-mask-fill",
    type: "fill",
    source: "outside-mask",
    paint: {
      "fill-color": "#f5f2f3",
      "fill-opacity": 0.18
    }
  });

  const response =
    await fetch(
      "./data/locais.geojson"
    );

  const geojson =
    await response.json();

  geojson.features.forEach(
    createMarker
  );

  applyFilter();

  fitMapToRadius(
    currentRadiusKm,
    false
  );

  const ongFeature =
    geojson.features.find(
      (feature) =>
        feature.properties.kind === "ong"
    );

  if (ongFeature) {
    showDetails(ongFeature);
  }
});