// Kenya counties and towns data
export interface County {
  id: number;
  name: string;
  code: string;
}

export interface Town {
  id: number;
  name: string;
  county_id: number;
}

export const counties: County[] = [
  { id: 1, name: 'Baringo', code: 'BAR' },
  { id: 2, name: 'Bomet', code: 'BOM' },
  { id: 3, name: 'Bungoma', code: 'BUN' },
  { id: 4, name: 'Busia', code: 'BUS' },
  { id: 5, name: 'Elgeyo-Marakwet', code: 'ELG' },
  { id: 6, name: 'Embu', code: 'EMB' },
  { id: 7, name: 'Garissa', code: 'GAR' },
  { id: 8, name: 'Homa Bay', code: 'HOM' },
  { id: 9, name: 'Isiolo', code: 'ISI' },
  { id: 10, name: 'Kajiado', code: 'KAJ' },
  { id: 11, name: 'Kakamega', code: 'KAK' },
  { id: 12, name: 'Kericho', code: 'KER' },
  { id: 13, name: 'Kiambu', code: 'KIA' },
  { id: 14, name: 'Kilifi', code: 'KIL' },
  { id: 15, name: 'Kirinyaga', code: 'KIR' },
  { id: 16, name: 'Kisii', code: 'KIS' },
  { id: 17, name: 'Kisumu', code: 'KSM' },
  { id: 18, name: 'Kitui', code: 'KIT' },
  { id: 19, name: 'Kwale', code: 'KWA' },
  { id: 20, name: 'Laikipia', code: 'LAI' },
  { id: 21, name: 'Lamu', code: 'LAM' },
  { id: 22, name: 'Machakos', code: 'MAC' },
  { id: 23, name: 'Makueni', code: 'MAK' },
  { id: 24, name: 'Mandera', code: 'MAN' },
  { id: 25, name: 'Marsabit', code: 'MAR' },
  { id: 26, name: 'Meru', code: 'MER' },
  { id: 27, name: 'Migori', code: 'MIG' },
  { id: 28, name: 'Mombasa', code: 'MOB' },
  { id: 29, name: 'Murang\'a', code: 'MUR' },
  { id: 30, name: 'Nairobi', code: 'NAI' },
  { id: 31, name: 'Nakuru', code: 'NAK' },
  { id: 32, name: 'Nandi', code: 'NAN' },
  { id: 33, name: 'Narok', code: 'NAR' },
  { id: 34, name: 'Nyamira', code: 'NYM' },
  { id: 35, name: 'Nyandarua', code: 'NYA' },
  { id: 36, name: 'Nyeri', code: 'NYE' },
  { id: 37, name: 'Samburu', code: 'SAM' },
  { id: 38, name: 'Siaya', code: 'SIA' },
  { id: 39, name: 'Taita-Taveta', code: 'TAI' },
  { id: 40, name: 'Tana River', code: 'TAN' },
  { id: 41, name: 'Tharaka-Nithi', code: 'THA' },
  { id: 42, name: 'Trans Nzoia', code: 'TRN' },
  { id: 43, name: 'Turkana', code: 'TUR' },
  { id: 44, name: 'Uasin Gishu', code: 'UAS' },
  { id: 45, name: 'Vihiga', code: 'VIH' },
  { id: 46, name: 'Wajir', code: 'WAJ' },
  { id: 47, name: 'West Pokot', code: 'WPK' }
];

export const towns: Town[] = [
  // Nairobi County (id: 30)
  { id: 1, name: 'Nairobi CBD', county_id: 30 },
  { id: 2, name: 'Westlands', county_id: 30 },
  { id: 3, name: 'Karen', county_id: 30 },
  { id: 4, name: 'Kasarani', county_id: 30 },
  { id: 5, name: 'Embakasi', county_id: 30 },
  
  // Mombasa County (id: 28)
  { id: 6, name: 'Mombasa', county_id: 28 },
  { id: 7, name: 'Likoni', county_id: 28 },
  { id: 8, name: 'Nyali', county_id: 28 },
  
  // Kiambu County (id: 13)
  { id: 9, name: 'Thika', county_id: 13 },
  { id: 10, name: 'Ruiru', county_id: 13 },
  { id: 11, name: 'Kikuyu', county_id: 13 },
  { id: 12, name: 'Limuru', county_id: 13 },
  
  // Nakuru County (id: 31)
  { id: 13, name: 'Nakuru', county_id: 31 },
  { id: 14, name: 'Naivasha', county_id: 31 },
  
  // Uasin Gishu County (id: 44)
  { id: 15, name: 'Eldoret', county_id: 44 },
  
  // Kisumu County (id: 17)
  { id: 16, name: 'Kisumu', county_id: 17 },
  
  // Machakos County (id: 22)
  { id: 17, name: 'Machakos', county_id: 22 },
  { id: 18, name: 'Athi River', county_id: 22 },
  
  // Kajiado County (id: 10)
  { id: 19, name: 'Kajiado', county_id: 10 },
  { id: 20, name: 'Kitengela', county_id: 10 }
];

export const getTownsByCounty = (countyId: number): Town[] => {
  return towns.filter(town => town.county_id === countyId);
};

export const getCountyById = (id: number): County | undefined => {
  return counties.find(county => county.id === id);
};

export const getTownById = (id: number): Town | undefined => {
  return towns.find(town => town.id === id);
};