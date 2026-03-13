import * as turf from '@turf/turf';
import type { GeoPolygon, Property, EncroachmentAlert } from '../types';
import { v4 as uuidv4 } from 'uuid';

// Calculate area of polygon in square meters
export function calculateArea(polygon: GeoPolygon): number {
  const feature = turf.polygon(polygon.coordinates);
  return turf.area(feature);
}

// Check if polygon A is completely within polygon B
export function isWithin(childPolygon: GeoPolygon, parentPolygon: GeoPolygon): boolean {
  const child = turf.polygon(childPolygon.coordinates);
  const parent = turf.polygon(parentPolygon.coordinates);
  return turf.booleanWithin(child, parent);
}

// Check if two polygons overlap
export function checkOverlap(polygon1: GeoPolygon, polygon2: GeoPolygon): boolean {
  const poly1 = turf.polygon(polygon1.coordinates);
  const poly2 = turf.polygon(polygon2.coordinates);
  return turf.booleanOverlap(poly1, poly2) || turf.booleanIntersects(poly1, poly2);
}

// Check polygon overlap with percentage
export function checkPolygonOverlap(
  polygon1: GeoPolygon, 
  polygon2: GeoPolygon
): { overlaps: boolean; percentage: number } {
  try {
    const poly1 = turf.polygon(polygon1.coordinates);
    const poly2 = turf.polygon(polygon2.coordinates);
    
    const overlaps = turf.booleanOverlap(poly1, poly2) || turf.booleanIntersects(poly1, poly2);
    
    if (!overlaps) {
      return { overlaps: false, percentage: 0 };
    }
    
    const intersection = turf.intersect(turf.featureCollection([poly1, poly2]));
    if (!intersection) {
      return { overlaps: false, percentage: 0 };
    }
    
    const intersectionArea = turf.area(intersection);
    const poly1Area = turf.area(poly1);
    const percentage = (intersectionArea / poly1Area) * 100;
    
    // Consider significant overlap if more than 5%
    return { 
      overlaps: percentage > 5, 
      percentage 
    };
  } catch {
    return { overlaps: false, percentage: 0 };
  }
}

// Get intersection area between two polygons
export function getIntersectionArea(polygon1: GeoPolygon, polygon2: GeoPolygon): number {
  try {
    const poly1 = turf.polygon(polygon1.coordinates);
    const poly2 = turf.polygon(polygon2.coordinates);
    const intersection = turf.intersect(turf.featureCollection([poly1, poly2]));
    if (intersection) {
      return turf.area(intersection);
    }
  } catch {
    return 0;
  }
  return 0;
}

// Validate subdivision: child areas must equal parent area
export function validateSubdivision(
  parentPolygon: GeoPolygon,
  childPolygons: GeoPolygon[],
  tolerance: number = 0.01 // 1% tolerance
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  const parentArea = calculateArea(parentPolygon);
  const childAreas = childPolygons.map(p => calculateArea(p));
  const totalChildArea = childAreas.reduce((sum, area) => sum + area, 0);
  
  // Check area sum
  const areaDiff = Math.abs(parentArea - totalChildArea) / parentArea;
  if (areaDiff > tolerance) {
    errors.push(`Child areas (${totalChildArea.toFixed(2)}m²) don't equal parent area (${parentArea.toFixed(2)}m²)`);
  }
  
  // Check each child is within parent
  for (let i = 0; i < childPolygons.length; i++) {
    if (!isWithin(childPolygons[i], parentPolygon)) {
      errors.push(`Child parcel ${i + 1} extends beyond parent boundary`);
    }
  }
  
  // Check children don't overlap each other
  for (let i = 0; i < childPolygons.length; i++) {
    for (let j = i + 1; j < childPolygons.length; j++) {
      if (checkOverlap(childPolygons[i], childPolygons[j])) {
        errors.push(`Child parcels ${i + 1} and ${j + 1} overlap`);
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

// Detect encroachment with existing properties
export function detectEncroachment(
  newPolygon: GeoPolygon,
  existingProperties: Property[],
  excludePropertyID?: string
): EncroachmentAlert[] {
  const alerts: EncroachmentAlert[] = [];
  
  for (const property of existingProperties) {
    if (property.propertyID === excludePropertyID) continue;
    if (property.status !== 'active') continue;
    
    if (checkOverlap(newPolygon, property.boundaryPolygon)) {
      const overlapArea = getIntersectionArea(newPolygon, property.boundaryPolygon);
      
      if (overlapArea > 0.1) { // More than 0.1 sq meter overlap
        alerts.push({
          alertID: uuidv4(),
          propertyID: '', // Will be filled when property is created
          conflictingPropertyID: property.propertyID,
          overlapArea,
          detectedAt: Date.now(),
          status: 'pending'
        });
      }
    }
  }
  
  return alerts;
}

// Get polygon center point
export function getPolygonCenter(polygon: GeoPolygon): [number, number] {
  const feature = turf.polygon(polygon.coordinates);
  const center = turf.centroid(feature);
  return center.geometry.coordinates as [number, number];
}

// Get polygon bounds
export function getPolygonBounds(polygon: GeoPolygon): { 
  minLng: number; 
  minLat: number; 
  maxLng: number; 
  maxLat: number; 
} {
  const feature = turf.polygon(polygon.coordinates);
  const bbox = turf.bbox(feature);
  return {
    minLng: bbox[0],
    minLat: bbox[1],
    maxLng: bbox[2],
    maxLat: bbox[3]
  };
}

// Create a simple rectangular polygon from center and dimensions
export function createRectanglePolygon(
  centerLng: number,
  centerLat: number,
  widthMeters: number,
  heightMeters: number
): GeoPolygon {
  const point = turf.point([centerLng, centerLat]);
  const buffered = turf.buffer(point, Math.max(widthMeters, heightMeters) / 2000, { units: 'kilometers' });
  
  if (buffered) {
    // Create proper rectangle
    const bbox = turf.bbox(buffered);
    const halfWidthDeg = (bbox[2] - bbox[0]) / 2 * (widthMeters / heightMeters);
    const halfHeightDeg = (bbox[3] - bbox[1]) / 2;
    
    return {
      type: 'Polygon',
      coordinates: [[
        [centerLng - halfWidthDeg, centerLat - halfHeightDeg],
        [centerLng + halfWidthDeg, centerLat - halfHeightDeg],
        [centerLng + halfWidthDeg, centerLat + halfHeightDeg],
        [centerLng - halfWidthDeg, centerLat + halfHeightDeg],
        [centerLng - halfWidthDeg, centerLat - halfHeightDeg]
      ]]
    };
  }
  
  // Fallback simple rectangle
  const degPerMeter = 0.00001;
  const halfWidth = widthMeters * degPerMeter / 2;
  const halfHeight = heightMeters * degPerMeter / 2;
  
  return {
    type: 'Polygon',
    coordinates: [[
      [centerLng - halfWidth, centerLat - halfHeight],
      [centerLng + halfWidth, centerLat - halfHeight],
      [centerLng + halfWidth, centerLat + halfHeight],
      [centerLng - halfWidth, centerLat + halfHeight],
      [centerLng - halfWidth, centerLat - halfHeight]
    ]]
  };
}

// Validate polygon is valid GeoJSON
export function validatePolygon(polygon: GeoPolygon): { valid: boolean; error?: string } {
  try {
    if (polygon.type !== 'Polygon') {
      return { valid: false, error: 'Must be a Polygon type' };
    }
    
    if (!polygon.coordinates || !polygon.coordinates[0]) {
      return { valid: false, error: 'Missing coordinates' };
    }
    
    const ring = polygon.coordinates[0];
    if (ring.length < 4) {
      return { valid: false, error: 'Polygon must have at least 4 points' };
    }
    
    // Check ring is closed
    const first = ring[0];
    const last = ring[ring.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) {
      return { valid: false, error: 'Polygon ring must be closed' };
    }
    
    // Check it's a valid polygon
    const feature = turf.polygon(polygon.coordinates);
    if (!turf.booleanValid(feature)) {
      return { valid: false, error: 'Invalid polygon geometry' };
    }
    
    return { valid: true };
  } catch (e) {
    return { valid: false, error: 'Invalid polygon structure' };
  }
}
