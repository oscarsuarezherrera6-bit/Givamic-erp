import { genId, todayISO } from './helpers'

export function buildSeedData() {
  const sedes = [
    { id: 's1', nombre: 'Almacén Central', direccion: 'Av. Principal 123, Lima', responsable: 'Juan Pérez', esCentral: true },
    { id: 's2', nombre: 'Sede San Isidro', direccion: 'Calle Las Flores 456, San Isidro', responsable: 'María García' },
    { id: 's3', nombre: 'Sede Miraflores', direccion: 'Av. Pardo 789, Miraflores', responsable: 'Carlos López' }
  ]

  const productos = [
  { id: genId(), codigo: '1001', nombre: 'ASPIRADORA DE POLVO Y AGUA 10 GALONES MASTER', categoria: 'Máquinas', unidad: 'UND', ultimoPrecio: 0, stockMinimo: 0, esKit: false, praneda: '', talla: '' },
  { id: genId(), codigo: '1002', nombre: 'LUSTRADORA LAVADORA 18\" TAURO 2.0 HP', categoria: 'Máquinas', unidad: 'UND', ultimoPrecio: 0, stockMinimo: 0, esKit: false, praneda: '', talla: '' },
  { id: genId(), codigo: '2001', nombre: 'ACIDO EFICAZ MULTICLEANER x Galon', categoria: 'Insumos', unidad: 'GL', ultimoPrecio: 0, stockMinimo: 0, esKit: false, praneda: '', talla: '' },
  { id: genId(), codigo: '2002', nombre: 'AMBIENTADOR - MULTICLEANER X GL', categoria: 'Insumos', unidad: 'GL', ultimoPrecio: 0, stockMinimo: 0, esKit: false, praneda: '', talla: '' },
  { id: genId(), codigo: '2003', nombre: 'ALCOHOL ISOPROPILICO 70% MULTICLEANER x Litro', categoria: 'Insumos', unidad: 'LT', ultimoPrecio: 0, stockMinimo: 0, esKit: false, praneda: '', talla: '' },
  { id: genId(), codigo: '2004', nombre: 'ALCOHOL RECTIFICADO 96° MULTICLEANER x Litro', categoria: 'Insumos', unidad: 'LT', ultimoPrecio: 0, stockMinimo: 0, esKit: false, praneda: '', talla: '' },
  { id: genId(), codigo: '2005', nombre: 'AIRLIFT SPARTAN', categoria: 'Insumos', unidad: 'GL', ultimoPrecio: 0, stockMinimo: 0, esKit: false, praneda: '', talla: '' },
  { id: genId(), codigo: '2006', nombre: 'CERA AL AGUA AMARILLA MULTICLEANER x Galon', categoria: 'Insumos', unidad: 'GL', ultimoPrecio: 0, stockMinimo: 0, esKit: false, praneda: '', talla: '' },
  { id: genId(), codigo: '2007', nombre: 'CERA BLANCA AL AGUA MULTICLEANER x Galon', categoria: 'Insumos', unidad: 'GL', ultimoPrecio: 0, stockMinimo: 0, esKit: false, praneda: '', talla: '' },
  { id: genId(), codigo: '2008', nombre: 'CERA BLANCA AUTOBRILLANTE x Galon', categoria: 'Insumos', unidad: 'GL', ultimoPrecio: 0, stockMinimo: 0, esKit: false, praneda: '', talla: '' },
  { id: genId(), codigo: '2009', nombre: 'CERA AL AGUA NEGRA MULTICLEANER x Galon', categoria: 'Insumos', unidad: 'GL', ultimoPrecio: 0, stockMinimo: 0, esKit: false, praneda: '', talla: '' },
  { id: genId(), codigo: '2010', nombre: 'CERA NEGRA AUTOBRILLANTE x Galon', categoria: 'Insumos', unidad: 'GL', ultimoPrecio: 0, stockMinimo: 0, esKit: false, praneda: '', talla: '' },
  { id: genId(), codigo: '2011', nombre: 'CERA AL AGUA ROJA MULTICLEANER x Galon', categoria: 'Insumos', unidad: 'GL', ultimoPrecio: 0, stockMinimo: 0, esKit: false, praneda: '', talla: '' },
  { id: genId(), codigo: '2012', nombre: 'CERA LIQUIDA ROJA SILICONEADA x Galon', categoria: 'Insumos', unidad: 'GL', ultimoPrecio: 0, stockMinimo: 0, esKit: false, praneda: '', talla: '' },
  { id: genId(), codigo: '2013', nombre: 'CLEAN BY PEROXY X GL', categoria: 'Insumos', unidad: 'GL', ultimoPrecio: 0, stockMinimo: 0, esKit: false, praneda: '', talla: '' },
  { id: genId(), codigo: '2014', nombre: 'AROMA AMBIENTADOR SPRAY SAPOLIO x 360 Ml x Unidad', categoria: 'Insumos', unidad: 'ML', ultimoPrecio: 0, stockMinimo: 0, esKit: false, praneda: '', talla: '' },
  { id: genId(), codigo: '2015', nombre: 'DETERGENTE ALCALINO X GALON', categoria: 'Insumos', unidad: 'GL', ultimoPrecio: 0, stockMinimo: 0, esKit: false, praneda: '', talla: '' },
  { id: genId(), codigo: '2016', nombre: 'DETERGENTE INDUSTRIAL x 15 kg', categoria: 'Insumos', unidad: 'KG', ultimoPrecio: 0, stockMinimo: 0, esKit: false, praneda: '', talla: '' },
  { id: genId(), codigo: '2017', nombre: 'DETERGENTE INDUSTRIAL x 1 kg', categoria: 'Insumos', unidad: 'KG', ultimoPrecio: 0, stockMinimo: 0, esKit: false, praneda: '', talla: '' },
  { id: genId(), codigo: '2018', nombre: 'LEJIA MULTICLEANER 5.5 x Galon', categoria: 'Insumos', unidad: 'GL', ultimoPrecio: 0, stockMinimo: 0, esKit: false, praneda: '', talla: '' },
  { id: genId(), codigo: '2019', nombre: 'LIMPIA VIDRIOS MULTICLEANER x Galon', categoria: 'Insumos', unidad: 'GL', ultimoPrecio: 0, stockMinimo: 0, esKit: false, praneda: '', talla: '' },
  { id: genId(), codigo: '2020', nombre: 'LIMPIADOR DAMP MOP X GL', categoria: 'Insumos', unidad: 'GL', ultimoPrecio: 0, stockMinimo: 0, esKit: false, praneda: '', talla: '' },
  { id: genId(), codigo: '2021', nombre: 'LIMPIA TODO MULTICLEANER LAVANDA x Galon', categoria: 'Insumos', unidad: 'GL', ultimoPrecio: 0, stockMinimo: 0, esKit: false, praneda: '', talla: '' },
  { id: genId(), codigo: '2022', nombre: 'LIMPIA ACERO SPRAY', categoria: 'Insumos', unidad: 'UND', ultimoPrecio: 0, stockMinimo: 0, esKit: false, praneda: '', talla: '' },
  { id: genId(), codigo: '2023', nombre: 'SACA SARRO MULTICLEANER x Galon', categoria: 'Insumos', unidad: 'GL', ultimoPrecio: 0, stockMinimo: 0, esKit: false, praneda: '', talla: '' },
  { id: genId(), codigo: '2024', nombre: 'SILICONA EMULSIOANDA MULTICLEANER x Galon', categoria: 'Insumos', unidad: 'GL', ultimoPrecio: 0, stockMinimo: 0, esKit: false, praneda: '', talla: '' },
  { id: genId(), codigo: '2025', nombre: 'THINNER ESTANDAR MULTICLEANER x Galon', categoria: 'Insumos', unidad: 'GL', ultimoPrecio: 0, stockMinimo: 0, esKit: false, praneda: '', talla: '' },
  { id: genId(), codigo: '2026', nombre: 'LAVAVAJILLA CREMA SAPOLIO POTE X 200 GR', categoria: 'Insumos', unidad: 'UND', ultimoPrecio: 0, stockMinimo: 0, esKit: false, praneda: '', talla: '' },
  { id: genId(), codigo: '2027', nombre: 'ACIDO MLD SPARTAN', categoria: 'Insumos', unidad: 'UND', ultimoPrecio: 0, stockMinimo: 0, esKit: false, praneda: '', talla: '' },
  { id: genId(), codigo: '2028', nombre: 'PERFUMADOR BOUQUETTE DARYZA GL', categoria: 'Insumos', unidad: 'GL', ultimoPrecio: 0, stockMinimo: 0, esKit: false, praneda: '', talla: '' },
  { id: genId(), codigo: '2029', nombre: 'LIMPIATODO ANTIBACTERIAL FLORAL DARYZA GL', categoria: 'Insumos', unidad: 'GL', ultimoPrecio: 0, stockMinimo: 0, esKit: false, praneda: '', talla: '' },
  { id: genId(), codigo: '4001', nombre: 'BASE METÁLICA PARA MOP 60', categoria: 'Insumos', unidad: 'UND', ultimoPrecio: 0, stockMinimo: 0, esKit: false, praneda: '', talla: '' },
  { id: genId(), codigo: '4001', nombre: 'BASE METÁLICA PARA MOP 60', categoria: 'Materiales', unidad: 'UND', ultimoPrecio: 0, stockMinimo: 0, esKit: false, praneda: '', talla: '' },
  { id: genId(), codigo: '4002', nombre: 'BASE METÁLICA PARA MOP 90', categoria: 'Materiales', unidad: 'UND', ultimoPrecio: 0, stockMinimo: 0, esKit: false, praneda: '', talla: '' },
  { id: genId(), codigo: '4003', nombre: 'EMBUDO PEQUEÑO', categoria: 'Materiales', unidad: 'UND', ultimoPrecio: 0, stockMinimo: 0, esKit: false, praneda: '', talla: '' },
  { id: genId(), codigo: '4004', nombre: 'ENVASE PARA ATOMIZADOR DE 1 LT', categoria: 'Materiales', unidad: 'UND', ultimoPrecio: 0, stockMinimo: 0, esKit: false, praneda: '', talla: '' },
  { id: genId(), codigo: '4005', nombre: 'ESCOBA AZUL HUDE ORIENTAL', categoria: 'Materiales', unidad: 'UND', ultimoPrecio: 0, stockMinimo: 0, esKit: false, praneda: '', talla: '' },
  { id: genId(), codigo: '4006', nombre: 'ESCOBILLON AZUL PARA BARRER GRANDE 60 CM', categoria: 'Materiales', unidad: 'UND', ultimoPrecio: 0, stockMinimo: 0, esKit: false, praneda: '', talla: '' },
  { id: genId(), codigo: '4007', nombre: 'ESCOBILLA DE MANO DE LAVAR PLASTICO CON ASA X UND', categoria: 'Materiales', unidad: 'UND', ultimoPrecio: 0, stockMinimo: 0, esKit: false, praneda: '', talla: '' },
  { id: genId(), codigo: '4008', nombre: 'ESCOBILLON DE TECHO ERIZO x Unidad', categoria: 'Materiales', unidad: 'UND', ultimoPrecio: 0, stockMinimo: 0, esKit: false, praneda: '', talla: '' },
  { id: genId(), codigo: '4009', nombre: 'ESCOBILLON INDUSTRIAL DE CERDA X 60 CM', categoria: 'Materiales', unidad: 'UND', ultimoPrecio: 0, stockMinimo: 0, esKit: false, praneda: '', talla: '' },
  { id: genId(), codigo: '4010', nombre: 'PALO DE MOPA RECTANGULAR', categoria: 'Materiales', unidad: 'UND', ultimoPrecio: 0, stockMinimo: 0, esKit: false, praneda: '', talla: '' },
  { id: genId(), codigo: '4011', nombre: 'ESPATULAS DE 3 \" X UNIDAD', categoria: 'Materiales', unidad: 'UND', ultimoPrecio: 0, stockMinimo: 0, esKit: false, praneda: '', talla: '' },
  { id: genId(), codigo: '4012', nombre: 'ESPONJA VERDE SCOTCH BRITE PQT x 15 UND', categoria: 'Materiales', unidad: 'UND', ultimoPrecio: 0, stockMinimo: 0, esKit: false, praneda: '', talla: '' },
  { id: genId(), codigo: '4013', nombre: 'GATILLO DE PULVERIZADOR REPUESTO x Unidad', categoria: 'Materiales', unidad: 'UND', ultimoPrecio: 0, stockMinimo: 0, esKit: false, praneda: '', talla: '' },
  { id: genId(), codigo: '4014', nombre: 'HISOPO PARA WC CON BASE x Unidad', categoria: 'Materiales', unidad: 'UND', ultimoPrecio: 0, stockMinimo: 0, esKit: false, praneda: '', talla: '' },
  { id: genId(), codigo: '4015', nombre: 'JALADOR DE AGUA UNA HOJA 60 CM', categoria: 'Materiales', unidad: 'UND', ultimoPrecio: 0, stockMinimo: 0, esKit: false, praneda: '', talla: '' },
  { id: genId(), codigo: '4016', nombre: 'JALADOR DE AGUA DOBLE GOMA 60 CM', categoria: 'Materiales', unidad: 'UND', ultimoPrecio: 0, stockMinimo: 0, esKit: false, praneda: '', talla: '' },
  { id: genId(), codigo: '4017', nombre: 'LIMPIADOR DE LUNA DE 45 CM C/BASE DE METAL', categoria: 'Materiales', unidad: 'UND', ultimoPrecio: 0, stockMinimo: 0, esKit: false, praneda: '', talla: '' },
  { id: genId(), codigo: '4018', nombre: 'MASCARILLAS 3 PLIEGUES CAJA X 50 UND', categoria: 'Materiales', unidad: 'UND', ultimoPrecio: 0, stockMinimo: 0, esKit: false, praneda: '', talla: '' },
  { id: genId(), codigo: '4019', nombre: 'PAÑO MICROFIBRA AMARILLO 40 X 40 CM 200 Gr X UND', categoria: 'Materiales', unidad: 'UND', ultimoPrecio: 0, stockMinimo: 0, esKit: false, praneda: '', talla: '' },
  { id: genId(), codigo: '4020', nombre: 'PAÑO MICROFIBRA AZUL 40 X 40 CM 200 Gr X UND', categoria: 'Materiales', unidad: 'UND', ultimoPrecio: 0, stockMinimo: 0, esKit: false, praneda: '', talla: '' },
  { id: genId(), codigo: '4021', nombre: 'PAÑO MICROFIBRA ROJO 40 X 40 CM 200 Gr X UND', categoria: 'Materiales', unidad: 'UND', ultimoPrecio: 0, stockMinimo: 0, esKit: false, praneda: '', talla: '' },
  { id: genId(), codigo: '4022', nombre: 'PAÑO MICROFIBRA VERDE 40 X 40 CM 200 Gr X UND', categoria: 'Materiales', unidad: 'UND', ultimoPrecio: 0, stockMinimo: 0, esKit: false, praneda: '', talla: '' },
  { id: genId(), codigo: '4023', nombre: 'PAÑO VIRUTEX ABSORVENTE AMARILLO X UND', categoria: 'Materiales', unidad: 'UND', ultimoPrecio: 0, stockMinimo: 0, esKit: false, praneda: '', talla: '' },
  { id: genId(), codigo: '4024', nombre: 'SEÑAL DE ADVERTENCIA(PISO MOJADO) x UND', categoria: 'Materiales', unidad: 'UND', ultimoPrecio: 0, stockMinimo: 0, esKit: false, praneda: '', talla: '' },
  { id: genId(), codigo: '4025', nombre: 'PLUMERO PVC 4 COLORES X UND', categoria: 'Materiales', unidad: 'UND', ultimoPrecio: 0, stockMinimo: 0, esKit: false, praneda: '', talla: '' },
  { id: genId(), codigo: '4026', nombre: 'SACUDIDOR DE TELA X UND', categoria: 'Materiales', unidad: 'UND', ultimoPrecio: 0, stockMinimo: 0, esKit: false, praneda: '', talla: '' },
  { id: genId(), codigo: '4027', nombre: 'RECOGEDOR DE PLASTICO ECONOMICO x UND', categoria: 'Materiales', unidad: 'UND', ultimoPrecio: 0, stockMinimo: 0, esKit: false, praneda: '', talla: '' },
  { id: genId(), codigo: '4028', nombre: 'BASE MOP LUNA 25 cm x Unidad', categoria: 'Materiales', unidad: 'UND', ultimoPrecio: 0, stockMinimo: 0, esKit: false, praneda: '', talla: '' },
  { id: genId(), codigo: '4029', nombre: 'REPUESTO MOPA DE PISO EBRIEL 60', categoria: 'Materiales', unidad: 'UND', ultimoPrecio: 0, stockMinimo: 0, esKit: false, praneda: '', talla: '' },
  { id: genId(), codigo: '4030', nombre: 'REPUESTO MOPA DE PISO EBRIEL 90', categoria: 'Materiales', unidad: 'UND', ultimoPrecio: 0, stockMinimo: 0, esKit: false, praneda: '', talla: '' },
  { id: genId(), codigo: '4031', nombre: 'TRAPEADOR DE MICROFIBRA AMARILLO CON OJAL 45 X 72 CM', categoria: 'Materiales', unidad: 'UND', ultimoPrecio: 0, stockMinimo: 0, esKit: false, praneda: '', talla: '' },
  { id: genId(), codigo: '4032', nombre: 'TRAPEADOR DE MICROFIBRA AZUL CON OJAL 45 X 72 CM', categoria: 'Materiales', unidad: 'UND', ultimoPrecio: 0, stockMinimo: 0, esKit: false, praneda: '', talla: '' },
  { id: genId(), codigo: '4033', nombre: 'TRAPEADOR DE MICROFIBRA VERDE CON OJAL 45 X 72 CM', categoria: 'Materiales', unidad: 'UND', ultimoPrecio: 0, stockMinimo: 0, esKit: false, praneda: '', talla: '' },
  { id: genId(), codigo: '4034', nombre: 'TRAPEADOR DE MICROFIBRA ROJO CON OJAL 45 X 72 CM', categoria: 'Materiales', unidad: 'UND', ultimoPrecio: 0, stockMinimo: 0, esKit: false, praneda: '', talla: '' },
  { id: genId(), codigo: '4035', nombre: 'TRAPO INDUSTRIAL BLANCO/FRACCIONADO x KILO', categoria: 'Materiales', unidad: 'UND', ultimoPrecio: 0, stockMinimo: 0, esKit: false, praneda: '', talla: '' },
  { id: genId(), codigo: '4036', nombre: 'Estructura de mopa circular', categoria: 'Materiales', unidad: 'UND', ultimoPrecio: 0, stockMinimo: 0, esKit: false, praneda: '', talla: '' },
  { id: genId(), codigo: '4037', nombre: 'BALDE DE COLOR AZUL 15 LT x UND', categoria: 'Materiales', unidad: 'UND', ultimoPrecio: 0, stockMinimo: 0, esKit: false, praneda: '', talla: '' },
  { id: genId(), codigo: '4038', nombre: 'BALDE DE COLOR ROJO 15 LT x UND', categoria: 'Materiales', unidad: 'UND', ultimoPrecio: 0, stockMinimo: 0, esKit: false, praneda: '', talla: '' },
  { id: genId(), codigo: '4039', nombre: 'BALDE DE COLOR VERDE 15 LT x UND', categoria: 'Materiales', unidad: 'UND', ultimoPrecio: 0, stockMinimo: 0, esKit: false, praneda: '', talla: '' },
  { id: genId(), codigo: '4040', nombre: 'CARRITO MULTIFUNCIONAL DE LIMPIEZA AZUL', categoria: 'Materiales', unidad: 'UND', ultimoPrecio: 0, stockMinimo: 0, esKit: false, praneda: '', talla: '' },
  { id: genId(), codigo: '4041', nombre: 'ESCALERA DE ALUMINIO DE 6 PASOS DE ALUMINIO', categoria: 'Materiales', unidad: 'UND', ultimoPrecio: 0, stockMinimo: 0, esKit: false, praneda: '', talla: '' },
  { id: genId(), codigo: '4042', nombre: 'CEPILLO CIRCULAR LAVA PISO 17\"', categoria: 'Materiales', unidad: 'UND', ultimoPrecio: 0, stockMinimo: 0, esKit: false, praneda: '', talla: '' },
  { id: genId(), codigo: '4043', nombre: 'CEPILLO CIRCULAR LAVA ALFOMBRA 17\"', categoria: 'Materiales', unidad: 'UND', ultimoPrecio: 0, stockMinimo: 0, esKit: false, praneda: '', talla: '' },
  { id: genId(), codigo: '4043', nombre: 'CEPILLO CIRCULAR LAVA ALFOMBRA 17\"', categoria: 'Materiales', unidad: 'UND', ultimoPrecio: 0, stockMinimo: 0, esKit: false, praneda: '', talla: '' },
  { id: genId(), codigo: '4044', nombre: 'EXTENSION ELECTRICA INDUSTRIAL DE 15 MT', categoria: 'Materiales', unidad: 'UND', ultimoPrecio: 0, stockMinimo: 0, esKit: false, praneda: '', talla: '' },
  { id: genId(), codigo: '4046', nombre: 'PAD BLANCO X 18\" UNIDAD', categoria: 'Materiales', unidad: 'UND', ultimoPrecio: 0, stockMinimo: 0, esKit: false, praneda: '', talla: '' },
  { id: genId(), codigo: '4047', nombre: 'PAD MARRON X 18\" UNIDAD', categoria: 'Materiales', unidad: 'UND', ultimoPrecio: 0, stockMinimo: 0, esKit: false, praneda: '', talla: '' },
  { id: genId(), codigo: '4048', nombre: 'PAD ROJO X 18\" UNIDAD', categoria: 'Materiales', unidad: 'UND', ultimoPrecio: 0, stockMinimo: 0, esKit: false, praneda: '', talla: '' },
  { id: genId(), codigo: '4049', nombre: 'PAD VERDE X 18\" UNIDAD', categoria: 'Materiales', unidad: 'UND', ultimoPrecio: 0, stockMinimo: 0, esKit: false, praneda: '', talla: '' },
  { id: genId(), codigo: '4050', nombre: 'PAD NEGRO X 18\" UNIDAD', categoria: 'Materiales', unidad: 'UND', ultimoPrecio: 0, stockMinimo: 0, esKit: false, praneda: '', talla: '' },
  { id: genId(), codigo: '4051', nombre: 'PAD NEGRO X 20\" UNIDAD', categoria: 'Materiales', unidad: 'UND', ultimoPrecio: 0, stockMinimo: 0, esKit: false, praneda: '', talla: '' },
  { id: genId(), codigo: '4052', nombre: 'PORTA PAD 18\" + BRAQUETA X UNIDAD', categoria: 'Materiales', unidad: 'UND', ultimoPrecio: 0, stockMinimo: 0, esKit: false, praneda: '', talla: '' },
  { id: genId(), codigo: '4052', nombre: 'PORTA PAD 18\" + BRAQUETA X UNIDAD', categoria: 'Materiales', unidad: 'UND', ultimoPrecio: 0, stockMinimo: 0, esKit: false, praneda: '', talla: '' },
  { id: genId(), codigo: '4053', nombre: 'Tocas para el cabello x 100', categoria: 'Materiales', unidad: 'CJ', ultimoPrecio: 0, stockMinimo: 0, esKit: false, praneda: '', talla: '' },
  { id: genId(), codigo: '4054', nombre: 'GUANTES VERDES S', categoria: 'Materiales', unidad: 'UND', ultimoPrecio: 0, stockMinimo: 0, esKit: false, praneda: '', talla: '' },
  { id: genId(), codigo: '4054', nombre: 'GUANTES VERDES S', categoria: 'Materiales', unidad: 'UND', ultimoPrecio: 0, stockMinimo: 0, esKit: false, praneda: '', talla: '' },
  { id: genId(), codigo: '4055', nombre: 'GUANTES VERDES M', categoria: 'Materiales', unidad: 'UND', ultimoPrecio: 0, stockMinimo: 0, esKit: false, praneda: '', talla: '' },
  { id: genId(), codigo: '4055', nombre: 'GUANTES VERDES M', categoria: 'Materiales', unidad: 'UND', ultimoPrecio: 0, stockMinimo: 0, esKit: false, praneda: '', talla: '' },
  { id: genId(), codigo: '4056', nombre: 'GUANTES VERDES L', categoria: 'Materiales', unidad: 'UND', ultimoPrecio: 0, stockMinimo: 0, esKit: false, praneda: '', talla: '' },
  { id: genId(), codigo: '4056', nombre: 'GUANTES VERDES L', categoria: 'Materiales', unidad: 'UND', ultimoPrecio: 0, stockMinimo: 0, esKit: false, praneda: '', talla: '' },
  { id: genId(), codigo: '4057', nombre: 'GUANTES VERDES XL', categoria: 'Materiales', unidad: 'UND', ultimoPrecio: 0, stockMinimo: 0, esKit: false, praneda: '', talla: '' },
  { id: genId(), codigo: '4058', nombre: 'GUANTES NEGROS S', categoria: 'Materiales', unidad: 'UND', ultimoPrecio: 0, stockMinimo: 0, esKit: false, praneda: '', talla: '' },
  { id: genId(), codigo: '4059', nombre: 'GUANTES NEGROS M', categoria: 'Materiales', unidad: 'UND', ultimoPrecio: 0, stockMinimo: 0, esKit: false, praneda: '', talla: '' },
  { id: genId(), codigo: '4060', nombre: 'GUANTES NEGROS L', categoria: 'Materiales', unidad: 'UND', ultimoPrecio: 0, stockMinimo: 0, esKit: false, praneda: '', talla: '' },
  { id: genId(), codigo: '4061', nombre: 'GUANTES NEGROS XL', categoria: 'Materiales', unidad: 'UND', ultimoPrecio: 0, stockMinimo: 0, esKit: false, praneda: '', talla: '' },
  { id: genId(), codigo: '4062', nombre: 'GUANTES DE LATEX S', categoria: 'Materiales', unidad: 'UND', ultimoPrecio: 0, stockMinimo: 0, esKit: false, praneda: '', talla: '' },
  { id: genId(), codigo: '4063', nombre: 'GUANTES DE LATEX M', categoria: 'Materiales', unidad: 'UND', ultimoPrecio: 0, stockMinimo: 0, esKit: false, praneda: '', talla: '' },
  { id: genId(), codigo: '4064', nombre: 'GUANTES DE LATEX L', categoria: 'Materiales', unidad: 'UND', ultimoPrecio: 0, stockMinimo: 0, esKit: false, praneda: '', talla: '' },
  { id: genId(), codigo: '4065', nombre: 'Traje tyvek', categoria: 'Materiales', unidad: 'UND', ultimoPrecio: 0, stockMinimo: 0, esKit: false, praneda: '', talla: '' },
  { id: genId(), codigo: '4066', nombre: 'GUANTES QUIRURGICOS CAJA x 100 UND', categoria: 'Materiales', unidad: 'CJ', ultimoPrecio: 0, stockMinimo: 0, esKit: false, praneda: '', talla: '' },
  { id: genId(), codigo: '4067', nombre: 'CUBRE BOTAS CAJA x 100', categoria: 'Materiales', unidad: 'UND', ultimoPrecio: 0, stockMinimo: 0, esKit: false, praneda: '', talla: '' },
  { id: genId(), codigo: '4068', nombre: 'Brocha 3 Pulgadas', categoria: 'Materiales', unidad: 'UND', ultimoPrecio: 0, stockMinimo: 0, esKit: false, praneda: '', talla: '' },
  { id: genId(), codigo: '4068', nombre: 'Brocha 3 Pulgadas', categoria: 'Materiales', unidad: 'UND', ultimoPrecio: 0, stockMinimo: 0, esKit: false, praneda: '', talla: '' },
  { id: genId(), codigo: '4069', nombre: 'BOLSA DE TELA PARA CARRITO', categoria: 'Materiales', unidad: 'UND', ultimoPrecio: 0, stockMinimo: 0, esKit: false, praneda: '', talla: '' },
  { id: genId(), codigo: '4070', nombre: 'BOLSA NEGRA 140 LT PQT x 100 UND', categoria: 'Materiales', unidad: 'PQT', ultimoPrecio: 0, stockMinimo: 0, esKit: false, praneda: '', talla: '' },
  { id: genId(), codigo: '4071', nombre: 'BOLSA NEGRA 75 LT PQT x 100 UND', categoria: 'Materiales', unidad: 'PQT', ultimoPrecio: 0, stockMinimo: 0, esKit: false, praneda: '', talla: '' },
  { id: genId(), codigo: '4072', nombre: 'BOLSA NEGRA 35 LT PQT x 100 UND', categoria: 'Materiales', unidad: 'PQT', ultimoPrecio: 0, stockMinimo: 0, esKit: false, praneda: '', talla: '' },
  { id: genId(), codigo: '4073', nombre: 'BOLSA ROJA 140 LT PQT x 100 UND', categoria: 'Materiales', unidad: 'PQT', ultimoPrecio: 0, stockMinimo: 0, esKit: false, praneda: '', talla: '' },
  { id: genId(), codigo: '4074', nombre: 'BOLSA ROJA 75 LT PQT x 100 UND', categoria: 'Materiales', unidad: 'PQT', ultimoPrecio: 0, stockMinimo: 0, esKit: false, praneda: '', talla: '' },
  { id: genId(), codigo: '4075', nombre: 'BOLSA ROJA 35 LT PQT x 100 UND', categoria: 'Materiales', unidad: 'PQT', ultimoPrecio: 0, stockMinimo: 0, esKit: false, praneda: '', talla: '' },
  { id: genId(), codigo: '4076', nombre: 'BOLSA AMARILLA 75 LT PQT x 100 UND', categoria: 'Materiales', unidad: 'PQT', ultimoPrecio: 0, stockMinimo: 0, esKit: false, praneda: '', talla: '' },
  { id: genId(), codigo: '4077', nombre: 'DESATORADOR DE WC GRANDE PLASTICO x UND', categoria: 'Materiales', unidad: 'PQT', ultimoPrecio: 0, stockMinimo: 0, esKit: false, praneda: '', talla: '' },
  // ── Kit de Ingreso (IDs estables para sincronizar con uniformeStock) ──────────
  { id: 'kit-camisa-s',  codigo: '5001', nombre: 'CAMISA S',    categoria: 'UNIFORME', unidad: 'UND', ultimoPrecio: 0, stockMinimo: 0, esKit: true, praneda: 'Camisa',   talla: 'S'   },
  { id: 'kit-camisa-m',  codigo: '5002', nombre: 'CAMISA M',    categoria: 'UNIFORME', unidad: 'UND', ultimoPrecio: 0, stockMinimo: 0, esKit: true, praneda: 'Camisa',   talla: 'M'   },
  { id: 'kit-camisa-l',  codigo: '5003', nombre: 'CAMISA L',    categoria: 'UNIFORME', unidad: 'UND', ultimoPrecio: 0, stockMinimo: 0, esKit: true, praneda: 'Camisa',   talla: 'L'   },
  { id: 'kit-camisa-xl', codigo: '5004', nombre: 'CAMISA XL',   categoria: 'UNIFORME', unidad: 'UND', ultimoPrecio: 0, stockMinimo: 0, esKit: true, praneda: 'Camisa',   talla: 'XL'  },
  { id: 'kit-blusa-s',   codigo: '5005', nombre: 'BLUSA S',     categoria: 'UNIFORME', unidad: 'UND', ultimoPrecio: 0, stockMinimo: 0, esKit: true, praneda: 'Blusa',    talla: 'S'   },
  { id: 'kit-blusa-m',   codigo: '5006', nombre: 'BLUSA M',     categoria: 'UNIFORME', unidad: 'UND', ultimoPrecio: 0, stockMinimo: 0, esKit: true, praneda: 'Blusa',    talla: 'M'   },
  { id: 'kit-blusa-l',   codigo: '5007', nombre: 'BLUSA L',     categoria: 'UNIFORME', unidad: 'UND', ultimoPrecio: 0, stockMinimo: 0, esKit: true, praneda: 'Blusa',    talla: 'L'   },
  { id: 'kit-blusa-xl',  codigo: '5008', nombre: 'BLUSA XL',    categoria: 'UNIFORME', unidad: 'UND', ultimoPrecio: 0, stockMinimo: 0, esKit: true, praneda: 'Blusa',    talla: 'XL'  },
  { id: 'kit-pant-30',   codigo: '5009', nombre: 'PANTALON 30', categoria: 'UNIFORME', unidad: 'UND', ultimoPrecio: 0, stockMinimo: 0, esKit: true, praneda: 'Pantalon', talla: '30'  },
  { id: 'kit-pant-32',   codigo: '5010', nombre: 'PANTALON 32', categoria: 'UNIFORME', unidad: 'UND', ultimoPrecio: 0, stockMinimo: 0, esKit: true, praneda: 'Pantalon', talla: '32'  },
  { id: 'kit-pant-34',   codigo: '5011', nombre: 'PANTALON 34', categoria: 'UNIFORME', unidad: 'UND', ultimoPrecio: 0, stockMinimo: 0, esKit: true, praneda: 'Pantalon', talla: '34'  },
  { id: 'kit-pant-36',   codigo: '5012', nombre: 'PANTALON 36', categoria: 'UNIFORME', unidad: 'UND', ultimoPrecio: 0, stockMinimo: 0, esKit: true, praneda: 'Pantalon', talla: '36'  },
  { id: 'kit-pant-38',   codigo: '5014', nombre: 'PANTALON 38', categoria: 'UNIFORME', unidad: 'UND', ultimoPrecio: 0, stockMinimo: 0, esKit: true, praneda: 'Pantalon', talla: '38'  },
  { id: 'kit-pant-40',   codigo: '5015', nombre: 'PANTALON 40', categoria: 'UNIFORME', unidad: 'UND', ultimoPrecio: 0, stockMinimo: 0, esKit: true, praneda: 'Pantalon', talla: '40'  },
  { id: 'kit-pant-42',   codigo: '5016', nombre: 'PANTALON 42', categoria: 'UNIFORME', unidad: 'UND', ultimoPrecio: 0, stockMinimo: 0, esKit: true, praneda: 'Pantalon', talla: '42'  },
  { id: 'kit-bota-36',   codigo: '5017', nombre: 'BOTA 36',     categoria: 'UNIFORME', unidad: 'UND', ultimoPrecio: 0, stockMinimo: 0, esKit: true, praneda: 'Bota',     talla: '36'  },
  { id: 'kit-bota-37',   codigo: '5018', nombre: 'BOTA 37',     categoria: 'UNIFORME', unidad: 'UND', ultimoPrecio: 0, stockMinimo: 0, esKit: true, praneda: 'Bota',     talla: '37'  },
  { id: 'kit-bota-38',   codigo: '5019', nombre: 'BOTA 38',     categoria: 'UNIFORME', unidad: 'UND', ultimoPrecio: 0, stockMinimo: 0, esKit: true, praneda: 'Bota',     talla: '38'  },
  { id: 'kit-bota-39',   codigo: '5020', nombre: 'BOTA 39',     categoria: 'UNIFORME', unidad: 'UND', ultimoPrecio: 0, stockMinimo: 0, esKit: true, praneda: 'Bota',     talla: '39'  },
  { id: 'kit-bota-40',   codigo: '5021', nombre: 'BOTA 40',     categoria: 'UNIFORME', unidad: 'UND', ultimoPrecio: 0, stockMinimo: 0, esKit: true, praneda: 'Bota',     talla: '40'  },
  { id: 'kit-bota-41',   codigo: '5022', nombre: 'BOTA 41',     categoria: 'UNIFORME', unidad: 'UND', ultimoPrecio: 0, stockMinimo: 0, esKit: true, praneda: 'Bota',     talla: '41'  },
  { id: 'kit-bota-42',   codigo: '5023', nombre: 'BOTA 42',     categoria: 'UNIFORME', unidad: 'UND', ultimoPrecio: 0, stockMinimo: 0, esKit: true, praneda: 'Bota',     talla: '42'  },
  { id: 'kit-bota-43',   codigo: '5025', nombre: 'BOTA 43',     categoria: 'UNIFORME', unidad: 'UND', ultimoPrecio: 0, stockMinimo: 0, esKit: true, praneda: 'Bota',     talla: '43'  },
  { id: 'kit-polo-s',    codigo: '5026', nombre: 'POLO OPE S',  categoria: 'UNIFORME', unidad: 'UND', ultimoPrecio: 0, stockMinimo: 0, esKit: true, praneda: 'Polo',     talla: 'S'   },
  { id: 'kit-polo-m',    codigo: '5027', nombre: 'POLO OPE M',  categoria: 'UNIFORME', unidad: 'UND', ultimoPrecio: 0, stockMinimo: 0, esKit: true, praneda: 'Polo',     talla: 'M'   },
  { id: 'kit-polo-l',    codigo: '5028', nombre: 'POLO OPE L',  categoria: 'UNIFORME', unidad: 'UND', ultimoPrecio: 0, stockMinimo: 0, esKit: true, praneda: 'Polo',     talla: 'L'   },
  { id: 'kit-polo-xl',   codigo: '5029', nombre: 'POLO OPE XL', categoria: 'UNIFORME', unidad: 'UND', ultimoPrecio: 0, stockMinimo: 0, esKit: true, praneda: 'Polo',     talla: 'XL'  },
  { id: 'kit-polo-xxl',  codigo: '5030', nombre: 'POLO OPE XXL',categoria: 'UNIFORME', unidad: 'UND', ultimoPrecio: 0, stockMinimo: 0, esKit: true, praneda: 'Polo',     talla: 'XXL' },
  { id: genId(),         codigo: '5030', nombre: 'Cinta de embalaje', categoria: 'UTILES', unidad: 'UND', ultimoPrecio: 0, stockMinimo: 0, esKit: false, praneda: '', talla: '' },
  { id: 'kit-buzo-s',    codigo: '5031', nombre: 'BUZO OPE S',  categoria: 'UNIFORME', unidad: 'UND', ultimoPrecio: 0, stockMinimo: 0, esKit: true, praneda: 'Buzo',     talla: 'S'   },
  { id: 'kit-buzo-m',    codigo: '5032', nombre: 'BUZO OPE M',  categoria: 'UNIFORME', unidad: 'UND', ultimoPrecio: 0, stockMinimo: 0, esKit: true, praneda: 'Buzo',     talla: 'M'   },
  { id: 'kit-buzo-l',    codigo: '5033', nombre: 'BUZO OPE L',  categoria: 'UNIFORME', unidad: 'UND', ultimoPrecio: 0, stockMinimo: 0, esKit: true, praneda: 'Buzo',     talla: 'L'   },
  { id: 'kit-buzo-xl',   codigo: '5034', nombre: 'BUZO OPE XL', categoria: 'UNIFORME', unidad: 'UND', ultimoPrecio: 0, stockMinimo: 0, esKit: true, praneda: 'Buzo',     talla: 'XL'  },
  { id: 'kit-buzo-xxl',  codigo: '5035', nombre: 'BUZO OPE XXL',categoria: 'UNIFORME', unidad: 'UND', ultimoPrecio: 0, stockMinimo: 0, esKit: true, praneda: 'Buzo',     talla: 'XXL' },
  { id: 'kit-gorra',     codigo: '5036', nombre: 'GORRA',       categoria: 'UNIFORME', unidad: 'UND', ultimoPrecio: 0, stockMinimo: 0, esKit: true, praneda: 'Gorra',    talla: 'UNI' },
  { id: 'kit-lente',     codigo: '5037', nombre: 'LENTES SEG.', categoria: 'UNIFORME', unidad: 'UND', ultimoPrecio: 0, stockMinimo: 0, esKit: true, praneda: 'Lente',    talla: 'UNI' },
  { id: genId(), codigo: '6001', nombre: 'CHINCHES DORADOS X 100 UND', categoria: 'Materiales', unidad: 'CJ', ultimoPrecio: 0, stockMinimo: 0, esKit: false, praneda: '', talla: '' },
  ]

  const proveedores = [
    { id: 'pv1', nombre: 'Distribuidora Lima S.A.C.', ruc: '20512345678', contacto: 'ventas@distribuidoralima.pe', telefono: '01-4567890' },
    { id: 'pv2', nombre: 'Insumos del Perú E.I.R.L.', ruc: '20601234567', contacto: 'pedidos@insumosperu.com', telefono: '01-3456789' },
    { id: 'pv3', nombre: 'Comercial Andes S.R.L.', ruc: '20498765432', contacto: 'info@comercialandes.pe', telefono: '01-2345678' }
  ]

  // Helpers de fecha (definidos aquí para usar en todo el seed)
  const ahora = new Date()
  const hace2m = (d) => { const dt = new Date(ahora); dt.setMonth(dt.getMonth()-2); dt.setDate(d); return dt.toISOString().split('T')[0] }
  const hace1m = (d) => { const dt = new Date(ahora); dt.setMonth(dt.getMonth()-1); dt.setDate(d); return dt.toISOString().split('T')[0] }
  const hoy = (d) => { const dt = new Date(ahora); dt.setDate(d); return dt.toISOString().split('T')[0] }
  const hoyMnt = ahora
  const addDias = (d) => { const f = new Date(hoyMnt); f.setDate(f.getDate()+d); return f.toISOString().slice(0,10) }
  const subDias = (d) => { const f = new Date(hoyMnt); f.setDate(f.getDate()-d); return f.toISOString().slice(0,10) }

  const facturas = [
    {
      id: 'f01', numero: 'F001-00123', proveedorId: 'pv1', fecha: hace2m(5), estado: 'Recibida',
      items: [
        { productoId: 'p01', producto: 'Detergente Industrial 5kg', cantidad: 20, precioUnit: 28.50, unidad: 'Bolsa' },
        { productoId: 'p02', producto: 'Desinfectante Pino 5L', cantidad: 15, precioUnit: 22.00, unidad: 'Galón' },
        { productoId: 'p06', producto: 'Lejía 1L', cantidad: 50, precioUnit: 4.50, unidad: 'Botella' }
      ]
    },
    {
      id: 'f02', numero: 'F001-00145', proveedorId: 'pv2', fecha: hace2m(12), estado: 'Recibida',
      items: [
        { productoId: 'p03', producto: 'Papel Higiénico x48 rollos', cantidad: 10, precioUnit: 38.00, unidad: 'Paquete' },
        { productoId: 'p07', producto: 'Jabón Líquido 5L', cantidad: 12, precioUnit: 18.00, unidad: 'Bidón' },
        { productoId: 'p10', producto: 'Alcohol en Gel 1L', cantidad: 20, precioUnit: 14.00, unidad: 'Botella' }
      ]
    },
    {
      id: 'f03', numero: 'F002-00067', proveedorId: 'pv3', fecha: hace1m(3), estado: 'Recibida',
      items: [
        { productoId: 'p04', producto: 'Bolsas Negras 140L x10', cantidad: 30, precioUnit: 12.50, unidad: 'Paquete' },
        { productoId: 'p05', producto: 'Guantes de Látex Talla M x100', cantidad: 10, precioUnit: 35.00, unidad: 'Caja' },
        { productoId: 'p08', producto: 'Escoba con palo', cantidad: 8, precioUnit: 15.00, unidad: 'Unidad' }
      ]
    },
    {
      id: 'f04', numero: 'F001-00189', proveedorId: 'pv1', fecha: hace1m(15), estado: 'Recibida',
      items: [
        { productoId: 'p01', producto: 'Detergente Industrial 5kg', cantidad: 25, precioUnit: 28.50, unidad: 'Bolsa' },
        { productoId: 'p09', producto: 'Trapeador Algodón', cantidad: 10, precioUnit: 12.00, unidad: 'Unidad' }
      ]
    },
    {
      id: 'f05', numero: 'F003-00034', proveedorId: 'pv2', fecha: hoy(3), estado: 'Pendiente',
      items: [
        { productoId: 'p02', producto: 'Desinfectante Pino 5L', cantidad: 20, precioUnit: 22.00, unidad: 'Galón' },
        { productoId: 'p10', producto: 'Alcohol en Gel 1L', cantidad: 30, precioUnit: 14.00, unidad: 'Botella' }
      ]
    }
  ]

  // Stock inicial en almacén central (ingresos por facturas)
  const stockCentral = {
    p01: { cantidad: 25, precio: 28.50 }, // 20+25 - 10 transferencias
    p02: { cantidad: 18, precio: 22.00 },
    p03: { cantidad: 6, precio: 38.00 },
    p04: { cantidad: 20, precio: 12.50 },
    p05: { cantidad: 7, precio: 35.00 },
    p06: { cantidad: 32, precio: 4.50 },
    p07: { cantidad: 8, precio: 18.00 },
    p08: { cantidad: 5, precio: 15.00 },
    p09: { cantidad: 7, precio: 12.00 },
    p10: { cantidad: 22, precio: 14.00 }
  }

  // Inventario por sede
  const inventario = {
    s1: Object.fromEntries(Object.entries(stockCentral).map(([k,v]) => [k, { ...v }])),
    s2: {
      p01: { cantidad: 8, precio: 28.50 },
      p03: { cantidad: 3, precio: 38.00 },
      p06: { cantidad: 12, precio: 4.50 },
      p07: { cantidad: 3, precio: 18.00 },
      p10: { cantidad: 5, precio: 14.00 }
    },
    s3: {
      p02: { cantidad: 7, precio: 22.00 },
      p04: { cantidad: 8, precio: 12.50 },
      p05: { cantidad: 2, precio: 35.00 },
      p08: { cantidad: 2, precio: 15.00 },
      p09: { cantidad: 2, precio: 12.00 }
    }
  }

  // Transferencias (vales VS-0001 al VS-0010)
  const mkItems = (arr) => arr.map((a,i) => ({
    id: `ti${i}`, productoId: a[0], descripcion: a[1], codigo: a[2],
    unidad: a[3], cantidad: a[4], precioUnit: a[5], precioTotal: a[4]*a[5], observaciones: ''
  }))

  const transferencias = [
    { id: 'tr01', numeroVale: 'VS-0001', fecha: hace2m(8), sedeDestinoId: 's2', areaSolicitante: 'Operaciones', responsable: 'Ana Torres',
      items: mkItems([['p01','Detergente Industrial 5kg','LIM-001','Bolsa',5,28.50],['p06','Lejía 1L','LIM-003','Botella',10,4.50]]) },
    { id: 'tr02', numeroVale: 'VS-0002', fecha: hace2m(10), sedeDestinoId: 's3', areaSolicitante: 'Limpieza', responsable: 'Pedro Ramos',
      items: mkItems([['p02','Desinfectante Pino 5L','LIM-002','Galón',4,22.00],['p04','Bolsas Negras 140L x10','CON-001','Paquete',6,12.50]]) },
    { id: 'tr03', numeroVale: 'VS-0003', fecha: hace2m(18), sedeDestinoId: 's2', areaSolicitante: 'Administración', responsable: 'Lucia Mendoza',
      items: mkItems([['p03','Papel Higiénico x48 rollos','HIG-001','Paquete',2,38.00],['p07','Jabón Líquido 5L','HIG-002','Bidón',3,18.00]]) },
    { id: 'tr04', numeroVale: 'VS-0004', fecha: hace2m(22), sedeDestinoId: 's3', areaSolicitante: 'Seguridad', responsable: 'Miguel Castillo',
      items: mkItems([['p05','Guantes de Látex Talla M x100','SEG-001','Caja',2,35.00],['p08','Escoba con palo','UTI-001','Unidad',1,15.00]]) },
    { id: 'tr05', numeroVale: 'VS-0005', fecha: hace1m(4), sedeDestinoId: 's2', areaSolicitante: 'Operaciones', responsable: 'Ana Torres',
      items: mkItems([['p10','Alcohol en Gel 1L','HIG-003','Botella',4,14.00],['p01','Detergente Industrial 5kg','LIM-001','Bolsa',3,28.50]]) },
    { id: 'tr06', numeroVale: 'VS-0006', fecha: hace1m(8), sedeDestinoId: 's3', areaSolicitante: 'Limpieza', responsable: 'Pedro Ramos',
      items: mkItems([['p02','Desinfectante Pino 5L','LIM-002','Galón',3,22.00],['p09','Trapeador Algodón','UTI-002','Unidad',2,12.00]]) },
    { id: 'tr07', numeroVale: 'VS-0007', fecha: hace1m(14), sedeDestinoId: 's2', areaSolicitante: 'RRHH', responsable: 'Sofía Vega',
      items: mkItems([['p06','Lejía 1L','LIM-003','Botella',8,4.50],['p07','Jabón Líquido 5L','HIG-002','Bidón',2,18.00]]) },
    { id: 'tr08', numeroVale: 'VS-0008', fecha: hace1m(20), sedeDestinoId: 's3', areaSolicitante: 'Operaciones', responsable: 'Miguel Castillo',
      items: mkItems([['p04','Bolsas Negras 140L x10','CON-001','Paquete',4,12.50],['p05','Guantes de Látex Talla M x100','SEG-001','Caja',1,35.00]]) },
    { id: 'tr09', numeroVale: 'VS-0009', fecha: hoy(2), sedeDestinoId: 's2', areaSolicitante: 'Limpieza', responsable: 'Ana Torres',
      items: mkItems([['p10','Alcohol en Gel 1L','HIG-003','Botella',3,14.00],['p03','Papel Higiénico x48 rollos','HIG-001','Paquete',1,38.00]]) },
    { id: 'tr10', numeroVale: 'VS-0010', fecha: hoy(5), sedeDestinoId: 's3', areaSolicitante: 'Administración', responsable: 'Pedro Ramos',
      items: mkItems([['p09','Trapeador Algodón','UTI-002','Unidad',1,12.00],['p08','Escoba con palo','UTI-001','Unidad',1,15.00]]) }
  ]

  // Calcular totales de transferencias
  transferencias.forEach(t => { t.total = t.items.reduce((s,i) => s + i.precioTotal, 0) })

  // Movimientos (construir desde facturas y transferencias)
  const movimientos = []
  facturas.forEach(f => {
    if (f.estado === 'Recibida') {
      f.items.forEach(it => {
        movimientos.push({
          id: genId(), tipo: 'INGRESO', fecha: f.fecha, sedeId: 's1',
          productoId: it.productoId, producto: it.producto, cantidad: it.cantidad,
          referencia: f.numero, observaciones: `Factura ${f.numero}`
        })
      })
    }
  })
  transferencias.forEach(t => {
    t.items.forEach(it => {
      movimientos.push({
        id: genId(), tipo: 'TRANSFERENCIA', fecha: t.fecha, sedeId: 's1',
        sedeDestinoId: t.sedeDestinoId, productoId: it.productoId, producto: it.descripcion,
        cantidad: -it.cantidad, referencia: t.numeroVale, observaciones: `Vale ${t.numeroVale}`
      })
    })
  })
  movimientos.sort((a,b) => new Date(b.fecha) - new Date(a.fecha))

  // Máquinas
  const maquinas = [
    { id: 'm01', nombre: 'Lustradora LIM-01', tipo: 'Lustradora', marca: 'Cleanmaster', modelo: 'CM-500', sedeId: 's2', fechaIngreso: hace2m(1), estado: 'Operativa', proximoMantenimiento: addDias(25), observaciones: '' },
    { id: 'm02', nombre: 'Lustradora LIM-02', tipo: 'Lustradora', marca: 'Cleanmaster', modelo: 'CM-500', sedeId: 's3', fechaIngreso: hace2m(1), estado: 'En servicio externo', proximoMantenimiento: subDias(5), observaciones: 'Motor en revisión' },
    { id: 'm03', nombre: 'Aspiradora ASP-01', tipo: 'Aspiradora', marca: 'Karcher', modelo: 'WD-3', sedeId: 's2', fechaIngreso: hace1m(5), estado: 'Operativa', proximoMantenimiento: addDias(60), observaciones: '' },
    { id: 'm04', nombre: 'Aspiradora ASP-02', tipo: 'Aspiradora', marca: 'Karcher', modelo: 'WD-5', sedeId: 's3', fechaIngreso: hace1m(10), estado: 'Operativa', proximoMantenimiento: '', observaciones: '' }
  ]

  const areas = [
    { id: 'ar1', nombre: 'Operaciones',       activo: true },
    { id: 'ar2', nombre: 'Recursos Humanos',  activo: true },
    { id: 'ar3', nombre: 'SOMA y SIG',        activo: true },
    { id: 'ar4', nombre: 'Logística',         activo: true },
    { id: 'ar5', nombre: 'Facturación',       activo: true },
    { id: 'ar6', nombre: 'Administración',    activo: true },
    { id: 'ar7', nombre: 'Gerencia',          activo: true },
  ]

  const usuarios = [
    { id: 'u1',  nombre: 'Administrador ERP',               email: 'admin@givamic.pe',                  password: 'admin123',     rol: 'Administrador',                    cargo: 'Administrador del Sistema',       area: 'Administración',   activo: true },
    { id: 'u2',  nombre: 'Oscar Mendoza',                   email: 'logistica@givamic.pe',              password: 'logistica123', rol: 'Coordinador Logística y Compras',  cargo: 'Coordinador de Logística y Compras', area: 'Logística',     activo: true },
    { id: 'u3',  nombre: 'Administradora de Empresa',       email: 'administradora@givamic.pe',         password: 'empresa123',   rol: 'Administrador de Empresa',         cargo: 'Administradora de Empresa',       area: 'Administración',   activo: true },
    { id: 'u4',  nombre: 'Contador',                        email: 'contador@givamic.pe',               password: 'conta123',     rol: 'Contador',                         cargo: 'Contador General',                area: 'Administración',   activo: true },
    { id: 'u5',  nombre: 'María García',                    email: 'coord.general@givamic.pe',          password: 'coordgen123',  rol: 'Coordinador General',              cargo: 'Coordinador General',             area: 'Operaciones',      activo: true },
    { id: 'u6',  nombre: 'Juan Pérez',                      email: 'coord.ops@givamic.pe',              password: 'coordops123',  rol: 'Coordinador Operaciones',          cargo: 'Coordinador de Operaciones',      area: 'Operaciones',      activo: true },
    { id: 'u7',  nombre: 'Jefe RRHH',                       email: 'jefe.rrhh@givamic.pe',              password: 'jrrhh123',     rol: 'Jefe RRHH',                        cargo: 'Jefe de Recursos Humanos',        area: 'Recursos Humanos', activo: true },
    { id: 'u8',  nombre: 'Ana López',                       email: 'asist.rrhh@givamic.pe',             password: 'arrhh123',     rol: 'Asistente RRHH',                   cargo: 'Asistente RRHH',                  area: 'Recursos Humanos', activo: true },
    { id: 'u9',  nombre: 'Asistente Logística',             email: 'asist.log@givamic.pe',              password: 'alog123',      rol: 'Asistente Logística',              cargo: 'Asistente de Logística',          area: 'Logística',        activo: true },
    { id: 'u10', nombre: 'Asistente de Facturación',        email: 'facturacion@givamic.pe',            password: 'factura123',   rol: 'Facturación',                      cargo: 'Asistente de Facturación',        area: 'Facturación',      activo: true },
    { id: 'u11', nombre: 'Carlos Ruiz',                     email: 'soma@givamic.pe',                   password: 'soma123',      rol: 'Coordinador Operaciones',          cargo: 'Asistente SOMA',                  area: 'SOMA y SIG',       activo: true },
    { id: 'u12', nombre: 'Roberto Torres',                  email: 'gerencia@givamic.pe',               password: 'gerencia123',  rol: 'Gerencia',                         cargo: 'Gerente General',                 area: 'Gerencia',         activo: true },
    // Usuario con cambio de cargo (para verificar snapshot): antes era Asistente RRHH, ahora es Coordinadora de Logística
    { id: 'u13', nombre: 'Patricia Luna',                   email: 'pluna@givamic.pe',                  password: 'pluna123',     rol: 'Coordinador Logística y Compras',  cargo: 'Coordinadora de Logística',       area: 'Logística',        activo: true,
      historialCargos: [{ cargo: 'Asistente RRHH', area: 'Recursos Humanos', desde: '2025-01-01', hasta: '2026-03-15', cambiadoPor: 'admin@givamic.pe' }]
    },
    { id: 'u14', nombre: 'Auditor ISO',                     email: 'auditor@givamic.pe',                password: 'auditor123',   rol: 'Auditor',                          cargo: 'Auditor ISO',                     area: 'SOMA y SIG',       activo: true },
  ]

  // Órdenes de Compra seed
  const ordenesCompra = [
    {
      id: 'oc001', numero: 'OC-0001', fecha: hace2m(5), fechaEntregaEsperada: hace1m(25),
      proveedorId: 'pv1', proveedor: 'Distribuidora Lima S.A.C.',
      items: [
        { id: 'oci01', productoId: 'p01', descripcion: 'Detergente Industrial 5kg', codigo: 'LIM-001', unidad: 'Bolsa', cantidad: 20, precioUnit: 28.50, total: 570 },
        { id: 'oci02', productoId: 'p06', descripcion: 'Lejía 1L', codigo: 'LIM-003', unidad: 'Botella', cantidad: 50, precioUnit: 4.50, total: 225 },
      ],
      totalNeto: 795, totalIGV: 143.10, totalGeneral: 938.10,
      area: 'Almacén', sedeId: 's1', aprobadoPor: 'Gerente General',
      estado: 'Completada', facturaId: 'f01', conformidadId: 'conf01', observaciones: ''
    },
    {
      id: 'oc002', numero: 'OC-0002', fecha: hace1m(10), fechaEntregaEsperada: hace1m(1),
      proveedorId: 'pv2', proveedor: 'Insumos del Perú E.I.R.L.',
      items: [
        { id: 'oci03', productoId: 'p03', descripcion: 'Papel Higiénico x48 rollos', codigo: 'HIG-001', unidad: 'Paquete', cantidad: 15, precioUnit: 38.00, total: 570 },
        { id: 'oci04', productoId: 'p07', descripcion: 'Jabón Líquido 5L', codigo: 'HIG-002', unidad: 'Bidón', cantidad: 10, precioUnit: 18.00, total: 180 },
      ],
      totalNeto: 750, totalIGV: 135, totalGeneral: 885,
      area: 'Almacén', sedeId: 's1', aprobadoPor: 'Administración',
      estado: 'Pendiente Inspección', facturaId: 'f02', conformidadId: null, observaciones: ''
    },
    {
      id: 'oc003', numero: 'OC-0003', fecha: todayISO(), fechaEntregaEsperada: '',
      proveedorId: 'pv3', proveedor: 'Comercial Andes S.R.L.',
      items: [
        { id: 'oci05', productoId: 'p05', descripcion: 'Guantes de Látex Talla M x100', codigo: 'SEG-001', unidad: 'Caja', cantidad: 10, precioUnit: 35.00, total: 350 },
        { id: 'oci06', productoId: 'p10', descripcion: 'Alcohol en Gel 1L', codigo: 'HIG-003', unidad: 'Botella', cantidad: 30, precioUnit: 14.00, total: 420 },
      ],
      totalNeto: 770, totalIGV: 138.60, totalGeneral: 908.60,
      area: 'RRHH', sedeId: '', aprobadoPor: '',
      estado: 'Emitida', facturaId: null, conformidadId: null, observaciones: 'Cotización solicitada'
    },
  ]

  const conformidades = [
    {
      id: 'conf01', numero: 'CONF-0001', fecha: hace1m(20),
      ocId: 'oc001', facturaId: 'f01',
      items: [
        { productoId: 'p01', descripcion: 'Detergente Industrial 5kg', codigo: 'LIM-001', unidad: 'Bolsa', cantidadSolicitada: 20, cantidadRecibida: 20, estado: 'Conforme', observacion: '' },
        { productoId: 'p06', descripcion: 'Lejía 1L', codigo: 'LIM-003', unidad: 'Botella', cantidadSolicitada: 50, cantidadRecibida: 48, estado: 'Observado', observacion: '2 unidades faltantes, pendiente regularización' },
      ],
      resultado: 'Conforme con Observaciones',
      inspeccionadoPor: 'Juan Pérez', aprobadoPor: 'Administración',
      observacionesGenerales: 'Productos en buen estado. Faltaron 2 unidades de Lejía.'
    }
  ]

  // RQs seed
  const rqs = [
    { id: 'rq001', numero: 'RQ-0001', descripcion: 'Materiales de limpieza para el mes de mayo', proveedor: 'Distribuidora Lima S.A.C.', proveedorId: 'pv1', monto: 1567.80, igv: 282.20, total: 1850.00, fechaRQ: '2026-05-28', fechaVence: '2026-06-12', area: 'Almacén', sedeId: 's1', estado: 'Aprobado', archivoPDF: null, nombreArchivo: '', observaciones: 'Urgente' },
    { id: 'rq002', numero: 'RQ-0002', descripcion: 'Servicio de mantenimiento lustradoras', proveedor: 'Insumos del Perú E.I.R.L.', proveedorId: 'pv2', monto: 423.73, igv: 76.27, total: 500.00, fechaRQ: '2026-06-05', fechaVence: '2026-06-25', area: 'Operaciones', sedeId: 's2', estado: 'Pendiente', archivoPDF: null, nombreArchivo: '', observaciones: '' },
    { id: 'rq003', numero: 'RQ-0003', descripcion: 'Compra guantes y mascarillas para personal', proveedor: 'Comercial Andes S.R.L.', proveedorId: 'pv3', monto: 762.71, igv: 137.29, total: 900.00, fechaRQ: '2026-06-10', fechaVence: '2026-06-30', area: 'RRHH', sedeId: '', estado: 'En Revisión', archivoPDF: null, nombreArchivo: '', observaciones: 'Para todas las sedes' },
    { id: 'rq004', numero: 'RQ-0004', descripcion: 'Alquiler local Sede Miraflores mes junio', proveedor: 'Inmobiliaria Central', proveedorId: '', monto: 2500.00, igv: 0, total: 2500.00, fechaRQ: '2026-06-01', fechaVence: '2026-06-15', area: 'Administración', sedeId: 's3', estado: 'Pagado', archivoPDF: null, nombreArchivo: '', observaciones: '' },
  ]

  // EPPs seed
  const epps = [
    { id: 'epp01', trabajador: 'Luis Cárdenas', dni: '45612378', sedeId: 's2', tipoEPP: 'Guantes de Nitrilo', talla: 'M', cantidad: 2, fechaEntrega: '2026-05-01', diasCambio: 30, observaciones: '' },
    { id: 'epp02', trabajador: 'Rosa Quispe', dni: '72345618', sedeId: 's2', tipoEPP: 'Mascarilla KN95', talla: 'S', cantidad: 10, fechaEntrega: '2026-05-10', diasCambio: 30, observaciones: '' },
    { id: 'epp03', trabajador: 'Pedro Vargas', dni: '61234589', sedeId: 's3', tipoEPP: 'Casco de Seguridad', talla: 'L', cantidad: 1, fechaEntrega: '2026-05-24', diasCambio: 30, observaciones: '' },
    { id: 'epp04', trabajador: 'Ana Torres', dni: '53472981', sedeId: 's3', tipoEPP: 'Botas de Jebe', talla: '39', cantidad: 1, fechaEntrega: '2026-06-01', diasCambio: 30, observaciones: 'Talla exacta requerida' },
    { id: 'epp05', trabajador: 'Carlos Ramos', dni: '48923716', sedeId: 's1', tipoEPP: 'Lentes de Seguridad', talla: 'ÚNICO', cantidad: 1, fechaEntrega: '2026-06-10', diasCambio: 30, observaciones: '' },
  ]

  // Empresas / Empleadores
  const empresas = [
    { id: 'emp01', razonSocial: 'GIVAMIC S.A.C.', ruc: '20601234567', domicilio: 'Av. Principal 123, Lima', telefono: '01-4567890', correoElectronico: 'logistica@givamic.pe' },
    { id: 'emp02', razonSocial: 'SOS REPRESENTACIONES S.A.C.', ruc: '20512345678', domicilio: 'Calle Las Flores 456, San Isidro', telefono: '01-3456789', correoElectronico: 'logistica@sosrepresentaciones.com' },
  ]


  // ── Requerimientos de Bienes y Servicios (SIG-FO-023) ──────────────────────
  const hace3d = () => { const dt = new Date(ahora); dt.setDate(dt.getDate()-3); return dt.toISOString().split('T')[0] }
  const hace5d = () => { const dt = new Date(ahora); dt.setDate(dt.getDate()-5); return dt.toISOString().split('T')[0] }
  const hace7d = () => { const dt = new Date(ahora); dt.setDate(dt.getDate()-7); return dt.toISOString().split('T')[0] }
  const hace10d = () => { const dt = new Date(ahora); dt.setDate(dt.getDate()-10); return dt.toISOString().split('T')[0] }
  const en3d = () => { const dt = new Date(ahora); dt.setDate(dt.getDate()+3); return dt.toISOString().split('T')[0] }
  const todayISO2 = () => ahora.toISOString().split('T')[0]

  const requerimientos = [
    {
      id: 'req001', numero: 'REQ-0001',
      estado: 'Pendiente de Aprobación', prioridad: 'Alta',
      responsable: 'María González', areaSolicitante: 'Operaciones',
      sedeId: 's3', fecha: hace3d(), tipo: 'Bien',
      items: [
        { id: 'ri001', descripcion: 'Detergente Industrial 5kg', productoId: 'p01', cantidad: 5, unidad: 'Bolsa', talla: '', fechaLimite: en3d(), horaLimite: '08:00', sedeId: 's3', especificaciones: 'Para limpieza de pisos industriales', estadoItem: 'Pendiente', cantidadAprobada: null, motivoRechazo: '' },
        { id: 'ri002', descripcion: 'Lejía 1L', productoId: 'p06', cantidad: 10, unidad: 'Botella', talla: '', fechaLimite: en3d(), horaLimite: '08:00', sedeId: 's3', especificaciones: '', estadoItem: 'Pendiente', cantidadAprobada: null, motivoRechazo: '' },
        { id: 'ri003', descripcion: 'Desinfectante Pino 5L', productoId: 'p02', cantidad: 3, unidad: 'Galón', talla: '', fechaLimite: en3d(), horaLimite: '08:00', sedeId: 's3', especificaciones: 'Concentrado para dilución', estadoItem: 'Pendiente', cantidadAprobada: null, motivoRechazo: '' },
      ],
      requeridoPorNombre: 'María González', requeridoPorCargo: 'Coordinadora de Sede', rolSolicitante: 'Coordinador Operaciones',
      aprobadoPor: '', comentarioAprobacion: '', fechaAprobacion: '', valeId: null, motivoRechazo: '',
    },
    {
      id: 'req002', numero: 'REQ-0002',
      estado: 'Aprobado - En Almacén', prioridad: 'Media',
      responsable: 'Carlos Flores', areaSolicitante: 'SSOMA',
      sedeId: 's2', fecha: hace3d(), tipo: 'Bien',
      items: [
        { id: 'ri004', descripcion: 'Guantes de Látex Talla M x100', productoId: 'p05', cantidad: 3, unidad: 'Caja', talla: 'M', fechaLimite: en3d(), horaLimite: '09:00', sedeId: 's2', especificaciones: 'Para personal de limpieza', estadoItem: 'Pendiente', cantidadAprobada: null, motivoRechazo: '' },
        { id: 'ri005', descripcion: 'Alcohol en Gel 1L', productoId: 'p10', cantidad: 5, unidad: 'Botella', talla: '', fechaLimite: en3d(), horaLimite: '09:00', sedeId: 's2', especificaciones: '', estadoItem: 'Pendiente', cantidadAprobada: null, motivoRechazo: '' },
      ],
      requeridoPorNombre: 'Carlos Flores', requeridoPorCargo: 'Coordinador SSOMA', rolSolicitante: 'Coordinador Operaciones',
      aprobadoPor: 'Oscar Suarez (Coord. General)', comentarioAprobacion: 'Aprobado. Atender a la brevedad.', fechaAprobacionJefe: '2026-06-26', valeId: null, motivoRechazo: '',
    },
    {
      id: 'req003', numero: 'REQ-0003',
      estado: 'Completado', prioridad: 'Baja',
      responsable: 'Ana Vargas', areaSolicitante: 'Logística',
      sedeId: 's1', fecha: hace7d(), tipo: 'Bien',
      items: [
        { id: 'ri006', descripcion: 'Papel Higiénico x48 rollos', productoId: 'p03', cantidad: 2, unidad: 'Paquete', talla: '', fechaLimite: hace5d(), horaLimite: '10:00', sedeId: 's1', especificaciones: '', estadoItem: 'Aprobado', cantidadAprobada: 2, motivoRechazo: '' },
        { id: 'ri007', descripcion: 'Jabón Líquido 5L', productoId: 'p07', cantidad: 2, unidad: 'Bidón', talla: '', fechaLimite: hace5d(), horaLimite: '10:00', sedeId: 's1', especificaciones: '', estadoItem: 'Aprobado', cantidadAprobada: 2, motivoRechazo: '' },
      ],
      requeridoPorNombre: 'Ana Vargas', requeridoPorCargo: 'Coordinadora de Logística',
      aprobadoPor: 'Administrador', comentarioAprobacion: 'Aprobado según stock disponible en almacén central', fechaAprobacion: hace5d(),
      valeId: 'vs_req003', motivoRechazo: '',
    },
    {
      id: 'req004', numero: 'REQ-0004',
      estado: 'Rechazado', prioridad: 'Alta',
      responsable: 'Roberto Sánchez', areaSolicitante: 'Operaciones',
      sedeId: 's2', fecha: hace10d(), tipo: 'Servicio',
      items: [
        { id: 'ri008', descripcion: 'Servicio de mantenimiento de máquina lustradora Taski 6050', productoId: null, cantidad: 1, unidad: 'Servicio', talla: '', fechaLimite: hace7d(), horaLimite: '07:00', sedeId: 's2', especificaciones: 'Marca Taski, modelo 6050. Requiere técnico especializado.', estadoItem: 'Rechazado', cantidadAprobada: 0, motivoRechazo: 'Los servicios de mantenimiento no son gestionados por almacén. Coordinar directamente con área de mantenimiento.' },
      ],
      requeridoPorNombre: 'Roberto Sánchez', requeridoPorCargo: 'Jefe de Operaciones',
      aprobadoPor: 'Administrador', comentarioAprobacion: '',
      fechaAprobacion: hace7d(), valeId: null,
      motivoRechazo: 'Fuera del alcance del almacén — coordinar con mantenimiento',
    },
    {
      id: 'req005', numero: 'REQ-0005',
      estado: 'Borrador', prioridad: 'Media',
      responsable: 'Patricia Luna', areaSolicitante: 'Administrativo',
      sedeId: 's2', fecha: todayISO2(), tipo: 'Bien',
      items: [
        { id: 'ri009', descripcion: 'Jabón Líquido 5L', productoId: 'p07', cantidad: 3, unidad: 'Bidón', talla: '', fechaLimite: '', horaLimite: '', sedeId: 's2', especificaciones: '', estadoItem: 'Pendiente', cantidadAprobada: null, motivoRechazo: '' },
        { id: 'ri010', descripcion: 'Bolsas Negras 140L x10', productoId: 'p04', cantidad: 4, unidad: 'Paquete', talla: '', fechaLimite: '', horaLimite: '', sedeId: 's2', especificaciones: 'Para zona de residuos', estadoItem: 'Pendiente', cantidadAprobada: null, motivoRechazo: '' },
      ],
      requeridoPorNombre: 'Patricia Luna', requeridoPorCargo: 'Asistente Administrativa',
      aprobadoPor: '', comentarioAprobacion: '', fechaAprobacion: '', valeId: null, motivoRechazo: '',
    },
  ]

  const configPermisos = {
    'Administrador':                   { modulos: ['dashboard','requerimientos','cotizaciones','ordenes-compra','facturas','conformidades','almacen','uniformes','maquinas','epps','req-pago','cuentas-por-pagar','maestros','auditoria','evaluacion-proveedores','reportes','facturacion-clientes'], acciones: ['crear','editar','anular','aprobar','ver_precios','exportar'] },
    'Coordinador Logística y Compras': { modulos: ['dashboard','requerimientos','cotizaciones','ordenes-compra','facturas','conformidades','almacen','uniformes','maquinas','epps','req-pago','cuentas-por-pagar','evaluacion-proveedores','reportes'], acciones: ['crear','editar','anular','aprobar','ver_precios','exportar'] },
    'Administrador de Empresa':        { modulos: ['dashboard','ordenes-compra','req-pago','auditoria','reportes','facturacion-clientes'], acciones: ['aprobar','ver_precios','exportar'] },
    'Contador':                        { modulos: ['dashboard','facturas','req-pago','cuentas-por-pagar'], acciones: ['aprobar','editar','ver_precios','exportar'] },
    'Coordinador General':             { modulos: ['dashboard','requerimientos'], acciones: ['crear','aprobar','exportar'] },
    'Coordinador Operaciones':         { modulos: ['dashboard','requerimientos'], acciones: ['crear','exportar'] },
    'Jefe RRHH':                       { modulos: ['dashboard','requerimientos'], acciones: ['crear','aprobar','exportar'] },
    'Asistente RRHH':                  { modulos: ['dashboard','requerimientos'], acciones: ['crear','exportar'] },
    'Asistente Logística':             { modulos: ['dashboard','uniformes','epps'], acciones: ['crear','editar','exportar'] },
    'Facturación':                     { modulos: ['dashboard','req-pago','cuentas-por-pagar','facturacion-clientes'], acciones: ['crear','editar','exportar'] },
  }
  const configAprobaciones = {
    oc: { limiteAdmin: 2000 },
    reqPago: { limiteAdmin: 5000 },
  }


  // ── Kit de Ingresos: stock por productoId estable ────────────────────────────
  const uniformeStock = {
    'kit-camisa-s':  { nuevo:10, usado:4,  desechado:1 },
    'kit-camisa-m':  { nuevo:18, usado:6,  desechado:2 },
    'kit-camisa-l':  { nuevo:14, usado:5,  desechado:3 },
    'kit-camisa-xl': { nuevo:8,  usado:3,  desechado:1 },
    'kit-blusa-s':   { nuevo:12, usado:5,  desechado:2 },
    'kit-blusa-m':   { nuevo:16, usado:7,  desechado:1 },
    'kit-blusa-l':   { nuevo:9,  usado:4,  desechado:2 },
    'kit-blusa-xl':  { nuevo:5,  usado:2,  desechado:0 },
    'kit-pant-30':   { nuevo:4,  usado:2,  desechado:1 },
    'kit-pant-32':   { nuevo:7,  usado:3,  desechado:2 },
    'kit-pant-34':   { nuevo:9,  usado:4,  desechado:1 },
    'kit-pant-36':   { nuevo:11, usado:5,  desechado:2 },
    'kit-pant-38':   { nuevo:8,  usado:3,  desechado:1 },
    'kit-pant-40':   { nuevo:6,  usado:2,  desechado:0 },
    'kit-pant-42':   { nuevo:4,  usado:1,  desechado:1 },
    'kit-bota-36':   { nuevo:5,  usado:2,  desechado:1 },
    'kit-bota-37':   { nuevo:7,  usado:3,  desechado:0 },
    'kit-bota-38':   { nuevo:9,  usado:4,  desechado:2 },
    'kit-bota-39':   { nuevo:11, usado:5,  desechado:1 },
    'kit-bota-40':   { nuevo:8,  usado:6,  desechado:3 },
    'kit-bota-41':   { nuevo:6,  usado:4,  desechado:2 },
    'kit-bota-42':   { nuevo:5,  usado:3,  desechado:1 },
    'kit-bota-43':   { nuevo:3,  usado:1,  desechado:0 },
    'kit-polo-s':    { nuevo:10, usado:6,  desechado:3 },
    'kit-polo-m':    { nuevo:18, usado:8,  desechado:4 },
    'kit-polo-l':    { nuevo:14, usado:7,  desechado:3 },
    'kit-polo-xl':   { nuevo:8,  usado:4,  desechado:2 },
    'kit-polo-xxl':  { nuevo:4,  usado:1,  desechado:0 },
    'kit-buzo-s':    { nuevo:7,  usado:3,  desechado:1 },
    'kit-buzo-m':    { nuevo:12, usado:5,  desechado:2 },
    'kit-buzo-l':    { nuevo:10, usado:4,  desechado:1 },
    'kit-buzo-xl':   { nuevo:5,  usado:2,  desechado:0 },
    'kit-buzo-xxl':  { nuevo:3,  usado:1,  desechado:0 },
    'kit-gorra':     { nuevo:28, usado:12, desechado:5 },
    'kit-lente':     { nuevo:35, usado:0,  desechado:8 },
  }

  const uniformeEntregas = [
    {
      id: 'ue001', numero: 'ENT-0001', fecha: subDias(45),
      trabajadorNombre: 'Carlos Quispe Mamani', trabajadorDNI: '45678901',
      cargo: 'Operario de Limpieza', sedeNombre: 'Sede San Isidro',
      items: [
        { productoId:'kit-polo-m',   nombre:'POLO OPE M',  cantidad:2, condicion:'Nuevo' },
        { productoId:'kit-buzo-m',   nombre:'BUZO OPE M',  cantidad:1, condicion:'Nuevo' },
        { productoId:'kit-pant-38',  nombre:'PANTALON 38', cantidad:1, condicion:'Nuevo' },
        { productoId:'kit-bota-40',  nombre:'BOTA 40',     cantidad:1, condicion:'Nuevo' },
        { productoId:'kit-camisa-m', nombre:'CAMISA M',    cantidad:2, condicion:'Nuevo' },
        { productoId:'kit-gorra',    nombre:'GORRA',       cantidad:1, condicion:'Nuevo' },
        { productoId:'kit-lente',    nombre:'LENTES SEG.', cantidad:1, condicion:'Nuevo' },
      ],
      estado: 'Activo', observaciones: 'Ingreso nuevo personal — contrato indefinido'
    },
    {
      id: 'ue002', numero: 'ENT-0002', fecha: subDias(38),
      trabajadorNombre: 'María Elena Flores', trabajadorDNI: '72345678',
      cargo: 'Operaria de Limpieza', sedeNombre: 'Sede Miraflores',
      items: [
        { productoId:'kit-blusa-s',  nombre:'BLUSA S',     cantidad:2, condicion:'Nuevo' },
        { productoId:'kit-buzo-s',   nombre:'BUZO OPE S',  cantidad:1, condicion:'Nuevo' },
        { productoId:'kit-pant-32',  nombre:'PANTALON 32', cantidad:1, condicion:'Nuevo' },
        { productoId:'kit-bota-37',  nombre:'BOTA 37',     cantidad:1, condicion:'Nuevo' },
        { productoId:'kit-gorra',    nombre:'GORRA',       cantidad:1, condicion:'Nuevo' },
      ],
      estado: 'Activo', observaciones: 'Personal nuevo sede Miraflores'
    },
    {
      id: 'ue003', numero: 'ENT-0003', fecha: subDias(30),
      trabajadorNombre: 'José Luis Ramos', trabajadorDNI: '61234567',
      cargo: 'Supervisor de Limpieza', sedeNombre: 'Sede La Molina',
      items: [
        { productoId:'kit-polo-l',   nombre:'POLO OPE L',  cantidad:3, condicion:'Nuevo' },
        { productoId:'kit-buzo-l',   nombre:'BUZO OPE L',  cantidad:2, condicion:'Nuevo' },
        { productoId:'kit-pant-40',  nombre:'PANTALON 40', cantidad:2, condicion:'Nuevo' },
        { productoId:'kit-bota-41',  nombre:'BOTA 41',     cantidad:1, condicion:'Nuevo' },
        { productoId:'kit-camisa-l', nombre:'CAMISA L',    cantidad:2, condicion:'Nuevo' },
        { productoId:'kit-lente',    nombre:'LENTES SEG.', cantidad:2, condicion:'Nuevo' },
      ],
      estado: 'Activo', observaciones: 'Renovación anual de uniformes'
    },
    {
      id: 'ue004', numero: 'ENT-0004', fecha: subDias(22),
      trabajadorNombre: 'Ana Lucía Torres', trabajadorDNI: '48901234',
      cargo: 'Operaria de Limpieza', sedeNombre: 'Sede San Isidro',
      items: [
        { productoId:'kit-blusa-m',  nombre:'BLUSA M',     cantidad:2, condicion:'Nuevo'  },
        { productoId:'kit-pant-34',  nombre:'PANTALON 34', cantidad:1, condicion:'Nuevo'  },
        { productoId:'kit-bota-38',  nombre:'BOTA 38',     cantidad:1, condicion:'Nuevo'  },
        { productoId:'kit-polo-m',   nombre:'POLO OPE M',  cantidad:1, condicion:'Usado'  },
        { productoId:'kit-gorra',    nombre:'GORRA',       cantidad:1, condicion:'Nuevo'  },
      ],
      estado: 'Activo', observaciones: 'Reposición parcial — camisa dañada'
    },
    {
      id: 'ue005', numero: 'ENT-0005', fecha: subDias(15),
      trabajadorNombre: 'Roberto Silva Huanca', trabajadorDNI: '53456789',
      cargo: 'Operario de Limpieza', sedeNombre: 'Sede San Borja',
      items: [
        { productoId:'kit-polo-xl',  nombre:'POLO OPE XL', cantidad:2, condicion:'Nuevo' },
        { productoId:'kit-buzo-xl',  nombre:'BUZO OPE XL', cantidad:1, condicion:'Nuevo' },
        { productoId:'kit-pant-42',  nombre:'PANTALON 42', cantidad:1, condicion:'Nuevo' },
        { productoId:'kit-bota-42',  nombre:'BOTA 42',     cantidad:1, condicion:'Nuevo' },
        { productoId:'kit-camisa-xl',nombre:'CAMISA XL',   cantidad:2, condicion:'Nuevo' },
        { productoId:'kit-gorra',    nombre:'GORRA',       cantidad:1, condicion:'Nuevo' },
        { productoId:'kit-lente',    nombre:'LENTES SEG.', cantidad:1, condicion:'Nuevo' },
      ],
      estado: 'Activo', observaciones: 'Ingreso nuevo personal — talla grande'
    },
    {
      id: 'ue006', numero: 'ENT-0006', fecha: subDias(7),
      trabajadorNombre: 'Lucía Mamani Condori', trabajadorDNI: '70123456',
      cargo: 'Operaria de Limpieza', sedeNombre: 'Sede Miraflores',
      items: [
        { productoId:'kit-blusa-s',  nombre:'BLUSA S',     cantidad:1, condicion:'Usado' },
        { productoId:'kit-polo-s',   nombre:'POLO OPE S',  cantidad:2, condicion:'Nuevo' },
        { productoId:'kit-pant-30',  nombre:'PANTALON 30', cantidad:1, condicion:'Nuevo' },
        { productoId:'kit-bota-36',  nombre:'BOTA 36',     cantidad:1, condicion:'Nuevo' },
        { productoId:'kit-gorra',    nombre:'GORRA',       cantidad:1, condicion:'Nuevo' },
      ],
      estado: 'Activo', observaciones: ''
    },
  ]

  const uniformeDevoluciones = [
    {
      id: 'ud001', numero: 'DEV-0001', fecha: subDias(10),
      entregaId: 'ue001',
      trabajadorNombre: 'Carlos Quispe Mamani', trabajadorDNI: '45678901',
      cargo: 'Operario de Limpieza', sedeNombre: 'Sede San Isidro',
      items: [
        { productoId:'kit-polo-m', nombre:'POLO OPE M', cantidad:1, estadoDevuelta:'Apto',     observacion:'Buen estado, lavado' },
        { productoId:'kit-bota-40',nombre:'BOTA 40',    cantidad:1, estadoDevuelta:'Desechado', observacion:'Suela desgastada, no reparable' },
      ],
      motivo: 'Cambio de sede — entrega parcial al salir', observaciones: 'Trabajador trasladado a sede Miraflores'
    },
    {
      id: 'ud002', numero: 'DEV-0002', fecha: subDias(5),
      entregaId: 'ue003',
      trabajadorNombre: 'José Luis Ramos', trabajadorDNI: '61234567',
      cargo: 'Supervisor de Limpieza', sedeNombre: 'Sede La Molina',
      items: [
        { productoId:'kit-polo-l',  nombre:'POLO OPE L', cantidad:1, estadoDevuelta:'Apto',     observacion:'En buen estado' },
        { productoId:'kit-buzo-l',  nombre:'BUZO OPE L', cantidad:1, estadoDevuelta:'Apto',     observacion:'Limpiar mancha menor' },
        { productoId:'kit-lente',   nombre:'LENTES SEG.',cantidad:1, estadoDevuelta:'Desechado', observacion:'Lente rayado, inutilizable' },
      ],
      motivo: 'Cese de funciones', observaciones: 'Trabajador con contrato finalizado'
    },
    {
      id: 'ud003', numero: 'DEV-0003', fecha: subDias(2),
      entregaId: 'ue002',
      trabajadorNombre: 'María Elena Flores', trabajadorDNI: '72345678',
      cargo: 'Operaria de Limpieza', sedeNombre: 'Sede Miraflores',
      items: [
        { productoId:'kit-bota-37', nombre:'BOTA 37', cantidad:1, estadoDevuelta:'Desechado', observacion:'Roto por uso intensivo' },
      ],
      motivo: 'Reposición por desgaste', observaciones: 'Se entregará bota nueva en próxima semana'
    },
  ]

  // Solicitudes de mantenimiento (externas al proveedor)
  const solicitudesMantenimiento = [
    { id:'sm01', numero:'SM-0001', maquinaId:'m02', maquinaNombre:'Lustradora LIM-02', sedeId:'s3', tipo:'Correctivo', descripcion:'Motor hace ruido anormal, posible desgaste de escobillas', proveedorId: proveedores[0]?.id||'', proveedorNombre: proveedores[0]?.nombre||'', fechaSolicitud: subDias(8), fechaRecojo: subDias(5), cotizacionNumero:'COT-0001', costo: 350, estado:'En proceso', observaciones:'Proveedor recogió la máquina' },
    { id:'sm02', numero:'SM-0002', maquinaId:'m01', maquinaNombre:'Lustradora LIM-01', sedeId:'s2', tipo:'Preventivo', descripcion:'Mantenimiento preventivo según calendario del fabricante', proveedorId: proveedores[0]?.id||'', proveedorNombre: proveedores[0]?.nombre||'', fechaSolicitud: subDias(2), fechaRecojo:'', cotizacionNumero:'', costo: null, estado:'Solicitado', observaciones:'' },
  ]

  const facturasClientes = [
    { id:'fc01', numeroFactura:'FC-001-0001', cliente:'Banco de Crédito del Perú', sedeId:'s2', sedeNombre:'Sede San Isidro', mes:'2026-04', tipo:'Regular', monto:12500, estado:'Pagada', observacion:'' },
    { id:'fc02', numeroFactura:'FC-001-0002', cliente:'Banco de Crédito del Perú', sedeId:'s3', sedeNombre:'Sede Miraflores', mes:'2026-04', tipo:'Regular', monto:9800, estado:'Pagada', observacion:'' },
    { id:'fc03', numeroFactura:'FC-001-0003', cliente:'Interbank', sedeId:'s2', sedeNombre:'Sede San Isidro', mes:'2026-04', tipo:'Regular', monto:11200, estado:'Pagada', observacion:'' },
    { id:'fc04', numeroFactura:'FC-001-0004', cliente:'Banco de Crédito del Perú', sedeId:'s2', sedeNombre:'Sede San Isidro', mes:'2026-04', tipo:'Adicional', monto:2800, estado:'Emitida', observacion:'Limpieza de fachada exterior no contemplada en contrato base' },
    { id:'fc05', numeroFactura:'FC-001-0005', cliente:'Banco de Crédito del Perú', sedeId:'s2', sedeNombre:'Sede San Isidro', mes:'2026-05', tipo:'Regular', monto:12500, estado:'Emitida', observacion:'' },
    { id:'fc06', numeroFactura:'FC-001-0006', cliente:'Banco de Crédito del Perú', sedeId:'s3', sedeNombre:'Sede Miraflores', mes:'2026-05', tipo:'Regular', monto:9800, estado:'Emitida', observacion:'' },
    { id:'fc07', numeroFactura:'FC-001-0007', cliente:'Interbank', sedeId:'s2', sedeNombre:'Sede San Isidro', mes:'2026-05', tipo:'Regular', monto:11200, estado:'Emitida', observacion:'' },
    { id:'fc08', numeroFactura:'FC-001-0008', cliente:'Interbank', sedeId:'s2', sedeNombre:'Sede San Isidro', mes:'2026-05', tipo:'Adicional', monto:1500, estado:'Emitida', observacion:'Servicio de desinfección adicional por evento corporativo' },
    { id:'fc09', numeroFactura:'FC-001-0009', cliente:'Banco de Crédito del Perú', sedeId:'s2', sedeNombre:'Sede San Isidro', mes:'2026-06', tipo:'Regular', monto:12500, estado:'Emitida', observacion:'' },
    { id:'fc10', numeroFactura:'FC-001-0010', cliente:'Banco de Crédito del Perú', sedeId:'s3', sedeNombre:'Sede Miraflores', mes:'2026-06', tipo:'Regular', monto:9800, estado:'Emitida', observacion:'' },
    { id:'fc11', numeroFactura:'FC-001-0011', cliente:'Interbank', sedeId:'s2', sedeNombre:'Sede San Isidro', mes:'2026-06', tipo:'Regular', monto:11200, estado:'Emitida', observacion:'' },
    { id:'fc12', numeroFactura:'FC-001-0012', cliente:'Clínica El Golf', sedeId:'s3', sedeNombre:'Sede Miraflores', mes:'2026-06', tipo:'Regular', monto:8900, estado:'Emitida', observacion:'' },
    { id:'fc13', numeroFactura:'FC-001-0013', cliente:'Clínica El Golf', sedeId:'s3', sedeNombre:'Sede Miraflores', mes:'2026-06', tipo:'Adicional', monto:3200, estado:'Emitida', observacion:'Limpieza de sala de operaciones con protocolo especial' },
  ]

  return {
    sedes, productos, proveedores,
    uniformeStock, uniformeEntregas, uniformeDevoluciones,
    ultimoUnifEnt: 6, ultimoUnifDev: 3,
    solicitudesMantenimiento,
    empresas,
    facturas, transferencias, movimientos,
    maquinas, inventario,
    ordenesCompra, ultimoOC: 3,
    configAprobaciones, configPermisos,
    notificaciones: [],
    conformidades, ultimoConformidad: 1,
    rqs, ultimoRQ: 4,
    epps,
    areas,
    usuarios,
    ultimoVale: 11,
    requerimientos, ultimoReq: 5,
    cotizaciones: [], reqPagos: [],
    evaluacionesProveedor: [],
    facturasClientes,
    reportesHistorial: [],
    auditLog: [],
    supervisores: [],
    logo: 'data:image/png;base64,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',
  }
}
