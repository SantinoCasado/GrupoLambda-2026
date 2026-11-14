import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { WebView, WebViewMessageEvent } from "react-native-webview";
import { Asset } from "expo-asset";
import { File } from "expo-file-system";
import {
  RESTAURANTE_LAT,
  RESTAURANTE_LNG,
} from "../config/delivery";

/**
 * Convierte un asset local en un data URI para poder incrustarlo en el HTML
 * del WebView. Las rutas locales (`file://`, `asset://`) no son confiables
 * dentro del WebView de Android; base64 funciona igual en dev y producción.
 */
const leerAssetComoDataUri = async (modulo: number): Promise<string> => {
  const asset = Asset.fromModule(modulo);
  await asset.downloadAsync();
  const uri = asset.localUri ?? asset.uri;
  const base64 = await new File(uri).base64();
  return `data:image/png;base64,${base64}`;
};

interface IconosMapa {
  casa: string | null;
  repartidor: string | null;
}

// La carga se cachea a nivel de módulo: el mapa se monta varias veces (picker,
// seguimiento, panel del repartidor) y no queremos releer los PNG cada vez.
let iconosPromesa: Promise<IconosMapa> | null = null;

const cargarIconosMapa = (): Promise<IconosMapa> => {
  if (!iconosPromesa) {
    iconosPromesa = Promise.all([
      leerAssetComoDataUri(require("../../assets/images/home-y.png")),
      leerAssetComoDataUri(require("../../assets/images/delivery-y.png")),
    ])
      .then(([casa, repartidor]) => ({ casa, repartidor }))
      .catch((error) => {
        console.warn("No se pudieron cargar los íconos del mapa:", error);
        return { casa: null, repartidor: null };
      });
  }
  return iconosPromesa;
};

export interface DeliveryMapProps {
  /**
   * `picker`: el cliente mueve el marcador para marcar su domicilio.
   * `route`: muestra la ruta desde el restaurante hasta el cliente.
   */
  mode: "picker" | "route";
  latitude: number;
  longitude: number;
  /**
   * Cambia sólo cuando el mapa debe recentrarse (por ejemplo, al elegir un
   * resultado del buscador). Los movimientos del marcador no lo cambian, así
   * el WebView no se recarga mientras el cliente arrastra el pin.
   */
  centerKey?: string | number;
  onPick?: (lat: number, lng: number) => void;
  height?: number;
}

const construirHtml = (
  mode: "picker" | "route",
  latitude: number,
  longitude: number,
  iconos: IconosMapa
) => {
  const destino = [latitude, longitude].join(",");
  const iconoCasa = JSON.stringify(iconos.casa ?? "");
  const iconoRepartidor = JSON.stringify(iconos.repartidor ?? "");

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; background: #f5f5f4; }
    .pin {
      width: 34px; height: 34px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      display: flex; align-items: center; justify-content: center;
      border: 3px solid #f7b538;
    }
    .pin span { transform: rotate(45deg); font-size: 16px; line-height: 1; }
    .pin img {
      width: 68%; height: 68%;
      object-fit: contain;
      transform: rotate(45deg);
      pointer-events: none;
    }
    .info {
      position: absolute; top: 10px; left: 10px; right: 10px; z-index: 999;
      background: rgba(255,255,255,0.96);
      border: 1px solid #e7e5e4;
      border-radius: 10px;
      padding: 8px 10px;
      font-family: -apple-system, BlinkMacSystemFont, Arial, sans-serif;
      font-size: 12px; font-weight: 600; color: #44403c;
      text-align: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.12);
    }
    .leaflet-control-attribution { font-size: 9px; }
  </style>
</head>
<body>
  <div id="map"></div>
  <div class="info" id="info">${
    mode === "picker"
      ? "Tocá el mapa o arrastrá el marcador."
      : "Calculando la ruta..."
  }</div>

  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var MODE = '${mode}';
    var DEST = [${latitude}, ${longitude}];
    var ORIGIN = [${RESTAURANTE_LAT}, ${RESTAURANTE_LNG}];
    var ICONO_CASA = ${iconoCasa};
    var ICONO_REPARTIDOR = ${iconoRepartidor};

    var map = L.map('map', { zoomControl: true, attributionControl: true })
      .setView(DEST, 16);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap'
    }).addTo(map);

    function crearIcono(emoji, color, imagen) {
      var contenido = imagen
        ? '<img src="' + imagen + '" alt="" />'
        : '<span>' + emoji + '</span>';

      return L.divIcon({
        className: '',
        html: '<div class="pin" style="background:' + color + '">' + contenido + '</div>',
        iconSize: [34, 42],
        iconAnchor: [17, 42],
        popupAnchor: [0, -38]
      });
    }

    function post(lat, lng) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ lat: lat, lng: lng }));
      }
    }

    var iconoDestino = MODE === 'route'
      ? crearIcono('🏠', '#780116', ICONO_CASA)
      : crearIcono('📍', '#780116', ICONO_REPARTIDOR);

    var destMarker = L.marker(DEST, {
      draggable: MODE === 'picker',
      icon: iconoDestino
    }).addTo(map);

    if (MODE === 'picker') {
      map.on('click', function (e) {
        destMarker.setLatLng(e.latlng);
        post(e.latlng.lat, e.latlng.lng);
      });

      destMarker.on('dragend', function () {
        var p = destMarker.getLatLng();
        post(p.lat, p.lng);
      });
    } else {
      L.marker(ORIGIN, { icon: crearIcono('🏮', '#0f766e') })
        .addTo(map)
        .bindPopup('Jardín Imperial');

      var info = document.getElementById('info');

      function rutaDirecta() {
        L.polyline([ORIGIN, DEST], {
          color: '#780116',
          weight: 4,
          opacity: 0.8,
          dashArray: '8 8'
        }).addTo(map);
        map.fitBounds(L.latLngBounds([ORIGIN, DEST]), { padding: [30, 30] });
        info.innerHTML = '🛵 Ruta directa al domicilio';
      }

      var url =
        'https://router.project-osrm.org/route/v1/driving/' +
        ORIGIN[1] + ',' + ORIGIN[0] + ';' +
        DEST[1] + ',' + DEST[0] +
        '?overview=full&geometries=geojson';

      fetch(url)
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (!data.routes || !data.routes[0]) {
            rutaDirecta();
            return;
          }
          var ruta = data.routes[0];
          var coords = ruta.geometry.coordinates.map(function (c) {
            return [c[1], c[0]];
          });
          L.polyline(coords, {
            color: '#780116',
            weight: 5,
            opacity: 0.85
          }).addTo(map);
          map.fitBounds(L.latLngBounds(coords), { padding: [30, 30] });

          var km = (ruta.distance / 1000).toFixed(1);
          var min = Math.max(1, Math.round(ruta.duration / 60));
          info.innerHTML =
            '🛵 Ruta estimada: <b>' + km + ' km</b> • <b>' + min + ' min</b>';
        })
        .catch(rutaDirecta);
    }
  </script>
</body>
</html>`;
};

export function DeliveryMap({
  mode,
  latitude,
  longitude,
  centerKey,
  onPick,
  height = 260,
}: DeliveryMapProps) {
  const [iconos, setIconos] = useState<IconosMapa | null>(null);

  useEffect(() => {
    let activo = true;
    cargarIconosMapa().then((res) => {
      if (activo) setIconos(res);
    });
    return () => {
      activo = false;
    };
  }, []);

  // `centerKey` controla cuándo se reconstruye el HTML. En modo picker no
  // incluimos lat/lng en las dependencias para no recargar el mapa en cada
  // arrastre del marcador (el WebView avisa el cambio por postMessage). En
  // modo ruta sí las incluimos: si el pedido termina de cargar después del
  // primer render, el mapa debe recentrarse en el domicilio real.
  const routeLat = mode === "route" ? latitude : 0;
  const routeLng = mode === "route" ? longitude : 0;

  const html = useMemo(
    () =>
      construirHtml(
        mode,
        latitude,
        longitude,
        iconos ?? { casa: null, repartidor: null }
      ),
    [mode, centerKey, routeLat, routeLng, iconos]
  );

  const handleMessage = (event: WebViewMessageEvent) => {
    if (!onPick) return;
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (typeof data?.lat === "number" && typeof data?.lng === "number") {
        onPick(data.lat, data.lng);
      }
    } catch {
      // Mensaje inesperado del WebView: se ignora.
    }
  };

  const seguro = Number.isFinite(latitude) && Number.isFinite(longitude);

  if (!seguro) {
    return <View style={{ height }} />;
  }

  if (!iconos) {
    return (
      <View
        style={{ height }}
        className="items-center justify-center overflow-hidden rounded-2xl border-2 border-mostaza/60 bg-stone-100"
      >
        <ActivityIndicator color="#780116" />
      </View>
    );
  }

  return (
    <View style={{ height }} className="overflow-hidden rounded-2xl border-2 border-mostaza/60">
      <WebView
        originWhitelist={["*"]}
        source={{ html }}
        style={{ flex: 1, backgroundColor: "#f5f5f4" }}
        javaScriptEnabled
        domStorageEnabled
        onMessage={handleMessage}
        setSupportMultipleWindows={false}
        startInLoadingState={false}
      />
    </View>
  );
}
