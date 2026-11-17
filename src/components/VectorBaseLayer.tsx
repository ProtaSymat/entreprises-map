import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import { maplibreGL } from "@maplibre/maplibre-gl-leaflet";
import type { Map as GLMap } from "maplibre-gl";
import { shouldHide, type DetailsState } from "../lib/mapDetails";

// Style vectoriel gratuit, sans clé : https://openfreemap.org
const STYLE_URL = "https://tiles.openfreemap.org/styles/positron";

function applyDetails(gl: GLMap, details: DetailsState) {
  const layers = gl.getStyle()?.layers ?? [];
  for (const layer of layers) {
    // On ne touche qu'aux couches de détail (symboles, lignes de frontière, etc.), jamais au fond.
    if (layer.type === "background") continue;
    gl.setLayoutProperty(layer.id, "visibility", shouldHide(layer.id, details) ? "none" : "visible");
  }
}

export function VectorBaseLayer({ details }: { details: DetailsState }) {
  const map = useMap();
  const layerRef = useRef<L.MaplibreGL | null>(null);
  const detailsRef = useRef(details);
  detailsRef.current = details;

  useEffect(() => {
    const layer = maplibreGL({ style: STYLE_URL, attributionControl: false });
    layer.addTo(map);
    layerRef.current = layer;
    const gl = layer.getMaplibreMap();
    const onReady = () => applyDetails(gl, detailsRef.current);
    gl.on("load", onReady);
    return () => {
      gl.off("load", onReady);
      map.removeLayer(layer);
      layerRef.current = null;
    };
  }, [map]);

  useEffect(() => {
    const gl = layerRef.current?.getMaplibreMap();
    if (gl && gl.isStyleLoaded()) applyDetails(gl, details);
  }, [details]);

  return null;
}
