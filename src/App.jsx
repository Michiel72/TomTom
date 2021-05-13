import React, { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl'; // eslint-disable-line import/no-webpack-loader-syntax
import './App.css';

const convertLngLatToCoordinates = ({ longitude, latitude }) => {
  const xCoordinate = 0.5 + longitude / 360;
  const yCoordinate = (Math.PI - Math.log(Math.tan(Math.PI / 4 + (latitude / 360) * Math.PI))) / (2 * Math.PI);
  return { xCoordinate, yCoordinate };
};

const addPointToAlreadyExistingPoint = (existingPoint, overlappingPoint) => ({
  ...existingPoint,
  properties: {
    ...existingPoint.properties,
    overlapping: [
      ...existingPoint.properties.overlapping,
      { id: overlappingPoint.properties.id, coordinates: overlappingPoint.geometry.coordinates },
    ],
  },
});

const calculateDistance = (point1, point2) =>
  Math.sqrt(
    (point1.properties.worldXY.xCoordinate - point2.properties.worldXY.xCoordinate) ** 2 +
      (point1.properties.worldXY.yCoordinate - point2.properties.worldXY.yCoordinate) ** 2
  );

const checkOverlap = (existingPoints, newPoint) => {
  const indexOfOverlappingPoint = existingPoints.findIndex((cur) => {
    const distance = calculateDistance(cur, newPoint);
    return distance < initialViewValues.minimalDistance;
  });
  return indexOfOverlappingPoint;
};

const isWithinViewBorders = ({ coordinates }, lowerLeft, upperRight) => {
  const isWithin =
    coordinates[0] > lowerLeft.longitude &&
    coordinates[0] < upperRight.longitude &&
    coordinates[1] > lowerLeft.latitude &&
    coordinates[1] < upperRight.latitude;
  return isWithin;
};

const combinePointsAndRemoveNonVisiblePoints = (rawData) => {
  const convertedData = rawData.reduce((acc, cur) => {
    if (!isWithinViewBorders(cur.geometry, initialViewValues.lowerLeft, initialViewValues.topRight)) return acc;
    const indexOfOverlappingPoint = checkOverlap(acc, cur);
    if (indexOfOverlappingPoint < 0) {
      const newEntry = { ...cur, properties: { ...cur.properties, overlapping: [] } };
      acc.push(newEntry);
    } else {
      const pointToAdjust = acc[indexOfOverlappingPoint];
      const newEntry = addPointToAlreadyExistingPoint(pointToAdjust, cur);
      acc[indexOfOverlappingPoint] = newEntry;
    }
    return acc;
  }, []);
  return convertedData;
};

const addPoints = (data, mapInstance) => {
  const convertedData = combinePointsAndRemoveNonVisiblePoints(data.features);
  // Add points to map as a GeoJSON source.
  mapInstance.addSource('points', {
    type: 'geojson',
    // data,
    data: { ...data, features: convertedData },
  });
};

mapboxgl.accessToken =
  'pk.eyJ1IjoibWljaGllbHZhbmRvb3JuIiwiYSI6ImNrb2xidjJlYzFkMzAycHJtYXZ0NGNqY2gifQ.FvS9mWASBY2X7kNimPVTbA';

const determineLngLatBorders = (longitude, latitude, zoomLevel) => {
  const middleCoordinates = convertLngLatToCoordinates({ longitude, latitude });
  const viewPort = 1 / 2 ** zoomLevel;
  const leftX = middleCoordinates.xCoordinate - viewPort / 2;
  const rightX = middleCoordinates.xCoordinate + viewPort / 2;
  const upperLeft = middleCoordinates;
};

const App = (zoomLevel, lngMiddle, latMiddle) => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [lng, setLng] = useState(lngMiddle);
  const [lat, setLat] = useState(latMiddle);
  const [zoom, setZoom] = useState(zoomLevel);
  const [dataPoints, setDataPoints] = useState([]);

  useEffect(() => {
    if (dataPoints.length > 0) return;
    // Load data points from GeoJSON file.
    fetch(
      'https://gist.githubusercontent.com/woutervh-/b9799584f2dc41141daddb5f7223d6a5/raw/bda38c3629bd431b3f4b88f48c6f35e78cfd5c6b/example%2520data-set.json'
    )
      .then((response) => response.json())
      .then((data) => {
        const convertedFeatures = data.features.map((cur) => {
          const worldXY = convertLngLatToCoordinates({
            longitude: cur.geometry.coordinates[0],
            latitude: cur.geometry.coordinates[1],
          });
          return {
            ...cur,
            properties: { id: cur.properties.id, worldXY },
          };
        });
        setDataPoints({ ...data, features: convertedFeatures });
      });
  }, []);

  useEffect(() => {
    if (map.current || dataPoints.length < 1) return; // initialize map only once
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        zoom: zoomLevel, // default zoom.
        center: [middleLngLat.longitude, middleLngLat.latitude], // default center coordinate in [longitude, latitude] format.
        sources: {
          // Using an open-source map tile layer.
          'simple-tiles': {
            type: 'raster',
            tiles: [
              'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
              'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
            ],
            tileSize: 256,
          },
        },
        layers: [
          {
            id: 'simple-tiles',
            type: 'raster',
            source: 'simple-tiles',
            minzoom: 0,
            maxzoom: 22,
          },
        ],
      },
    });
    map.current.on('load', () => {
      addPoints(dataPoints, map.current);

      // Add a layer to the map to render the GeoJSON points.
      map.current.addLayer({
        id: 'points',
        type: 'circle',
        source: 'points',
        paint: {
          'circle-radius': pointSize / 2,
          'circle-color': '#ff5500',
          'circle-stroke-width': 1,
          'circle-stroke-color': '#000',
        },
      });

      // Show a popup when clicking on a point.
      map.current.on('click', 'points', (event) => {
        const allFeatures = JSON.parse(event.features[0].properties.overlapping);
        new mapboxgl.Popup()
          .setLngLat(event.lngLat)
          .setHTML(`Clicked on ${allFeatures.length + 1} feature(s).`)
          .addTo(map.current);
      });

      // Change the cursor to a pointer when the mouse is over the points layer.
      map.current.on('mouseenter', 'points', () => {
        map.current.getCanvas().style.cursor = 'pointer';
      });

      // Change it back to a pointer when it leaves.
      map.current.on('mouseleave', 'points', () => {
        map.current.getCanvas().style.cursor = '';
      });
      map.current.on('move', () => {
        setLng(map.current.getCenter().lng.toFixed(4));
        setLat(map.current.getCenter().lat.toFixed(4));
        setZoom(map.current.getZoom().toFixed(2));
      });
    });
  });

  return (
    <div>
      <div className="sidebar">
        Longitude: {lng} | Latitude: {lat} | Zoom: {zoom}
      </div>
      <div
        ref={mapContainer}
        className="map-container"
        style={{ width: `${windowWidth}px`, height: `${windowHeight}px` }}
      />
    </div>
  );
};

export default App;
