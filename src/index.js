import React from 'react';
import ReactDOM from 'react-dom';
import 'mapbox-gl/dist/mapbox-gl.css';
import './index.css';
import App from './App';

const windowWidth = 500;
const windowHeight = 400;
const pointSize = 40;
const intendedLowerLeft = { longitude: -0.27603, latitude: 51.0904 };
const intendedTopRight = { longitude: 0.05081, latitude: 51.6836 };

const middleLngLat = {
  longitude: (intendedLowerLeft.longitude + intendedTopRight.longitude) / 2,
  latitude: (intendedLowerLeft.latitude + intendedTopRight.latitude) / 2,
};

const convertXCoordinateToLongitude = (xCoordinate) => {
  const longitude = 360 * xCoordinate - 180;
  return longitude;
};

const convertYCoordinateToLatitude = (yCoordinate) => {
  const latitude = (360 / Math.PI) * (Math.atan(Math.E ** (Math.PI - 2 * Math.PI * yCoordinate)) - 0.25 * Math.PI);
  return latitude;
};

const calculateZoomLevel = (xDifference) => Math.log2(1 / xDifference);

const determineMinimalDistanceAndLngLatBorders = (mapLL, mapTR, width, height) => {
  const middleCoordinates = convertLngLatToCoordinates(middleLngLat);
  const lowerLeft = convertLngLatToCoordinates(mapLL);
  const topRight = convertLngLatToCoordinates(mapTR);
  const horizontalPixelRatio = (topRight.xCoordinate - lowerLeft.xCoordinate) / width;
  const verticalPixelRatio = (topRight.yCoordinate - lowerLeft.yCoordinate) / height;
  if (horizontalPixelRatio > verticalPixelRatio) {
    const newVerticalSize = horizontalPixelRatio * windowHeight;
    const newLowerLeftYCoordinate = middleCoordinates.yCoordinate + newVerticalSize / 2;
    const newTopRightYCoordinate = middleCoordinates.yCoordinate - newVerticalSize / 2;
    return {
      minimalDistance: horizontalPixelRatio * pointSize,
      lowerLeft: { longitude: mapLL.longitude, latitude: convertYCoordinateToLatitude(newLowerLeftYCoordinate) },
      topRight: { longitude: mapTR.longitude, latitude: convertYCoordinateToLatitude(newTopRightYCoordinate) },
    };
  }
  const newHorizontalSize = verticalPixelRatio * width;
  const newLowerLeftXCoordinate = middleCoordinates.xCoordinate - newHorizontalSize / 2;
  const newTopRightXCoordinate = middleCoordinates.xCoordinate + newHorizontalSize / 2;
  return {
    minimalDistance: verticalPixelRatio * pointSize,
    lowerLeft: { longitude: convertXCoordinateToLongitude(newLowerLeftXCoordinate), latitude: mapLL.latitude },
    topRight: { longitude: convertXCoordinateToLongitude(newTopRightXCoordinate), latitude: mapTR.latitude },
  };
};

const initialViewValues = determineMinimalDistanceAndLngLatBorders(
  intendedLowerLeft,
  intendedTopRight,
  windowWidth,
  windowHeight
);
const recalculatedLowerLeftCoordinates = convertLngLatToCoordinates(initialViewValues.lowerLeft);
const recalculatedTopRightCoordinates = convertLngLatToCoordinates(initialViewValues.topRight);
const zoomLevel = calculateZoomLevel(
  recalculatedTopRightCoordinates.xCoordinate - recalculatedLowerLeftCoordinates.xCoordinate
);

ReactDOM.render(
  <React.StrictMode>
    <App zoomLevel={zoomLevel} lngMiddle={middleLngLat.longitude} latMiddle={middleLngLat.latitude} />
  </React.StrictMode>,
  document.getElementById('root')
);
