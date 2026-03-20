
export const getGridKey = (lat: number, lng: number) => {
    const gridSize = 0.05;

    const latKey = Math.floor(lat / gridSize);
    const lngKey = Math.floor(lng / gridSize);

    return `${latKey}-${lngKey}`;
}
    