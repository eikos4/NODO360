export const PARRAL_CUERPO = {
  city: 'Parral',
  region: 'Maule',
  bodyName: 'Cuerpo de Bomberos de Parral',
};

export const PARRAL_COMPANIES = [
  { number: '1', name: 'Primera Compañía de Bomberos de Parral', address: 'Calle Dieciocho 685, Parral' },
  { number: '2', name: 'Segunda Compañía de Bomberos de Parral', address: 'Calle Dieciocho 685, Parral' },
  { number: '3', name: 'Tercera Compañía de Bomberos de Parral', address: 'Calle Dieciocho 685, Parral' },
  { number: '4', name: 'Cuarta Compañía de Bomberos de Parral', address: 'Pasaje Plaza 345, sector norte, Parral' },
  { number: '5', name: 'Quinta Compañía de Bomberos de Parral', address: 'Localidad de Catillo, Parral' },
  { number: '6', name: 'Sexta Compañía de Bomberos de Parral', address: 'Camino Parral–Catillo km 17, Remulcao, Parral' },
];

export const PARRAL_CSV_TEMPLATE = `rut,nombres,apellidos,correo,contraseña,rol,compania,n_operativo
12.345.678-9,Mario,González,mario@cia.cl,Demo1234!,Bombero Operativo,1,12
13.456.789-0,Ana,Martínez,ana@cia.cl,Demo1234!,Capitán,1,1
39.012.345-6,Karen,Bravo,central@cia.cl,Demo1234!,Centralista,1,
18.901.234-5,Diego,Fuentes,diego@cia.cl,Demo1234!,Bombero Operativo,,
`;
