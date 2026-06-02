/**
 * Reglas:
 *  - Si ya votaste lo mismo → se cancela (toggle off)
 *  - Si votaste distinto → se cambia (un solo voto activo)
 *  - Si no habías votado → se añade
 *  - Los votos sí pueden ser negativos 
 *
 * IMPORTANTE: este cálculo es solo para optimistic UI.
 * La fuente de verdad SIEMPRE es el recuento del servidor
 * (COUNT up - COUNT down desde la tabla votos_publicaciones).
 *
 * @param {{ currentVote: 'up'|'down'|null, voteType: 'up'|'down', votes: number }}
 * @returns {{ nextVote: 'up'|'down'|null, votes: number }}
 */
export function computeVote({ currentVote, voteType, votes }) {
  const nextVote = currentVote === voteType ? null : voteType;

  let v = votes ?? 0;

  if (currentVote === 'up')   v -= 1;
  if (currentVote === 'down') v += 1;

  if (nextVote === 'up')   v += 1;
  if (nextVote === 'down') v -= 1;

  return { nextVote, votes: v };
}