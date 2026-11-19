import { IsString, IsNotEmpty, Equals, IsISO8601, IsObject, validateSync } from 'class-validator';

export class SobreEventoDto {
  @IsString()
  @IsNotEmpty()
  eventoId!: string;

  @IsString()
  @IsNotEmpty()
  tipo!: string;

  @Equals(1)
  version!: number;

  @IsISO8601()
  emitidoEn!: string;

  @IsString()
  @IsNotEmpty()
  juegoId!: string;

  @IsString()
  @IsNotEmpty()
  usuarioSub!: string;

  @IsObject()
  datos!: Record<string, any>;

  constructor(partial?: Partial<SobreEventoDto>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }
}

export function validarSobreEvento(dto: SobreEventoDto): void {
  const errores = validateSync(dto);
  if (errores.length > 0) {
    throw new Error(errores.map(e => Object.values(e.constraints || {})).join(', '));
  }
}
