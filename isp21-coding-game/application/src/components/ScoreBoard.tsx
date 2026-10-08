import type { GameState } from '../types';
import { LEVELS } from '../levels';

interface ScoreBoardProps {
  gameState: GameState;
  nickname: string;
  nicknameDraft: string;
  nicknameMax: number;
  totalStars: number;
  totalPoints: number;
  onDraftChange: (value: string) => void;
  onSave: () => void;
  compact?: boolean;
}

export const ScoreBoard = ({
  gameState,
  nickname,
  nicknameDraft,
  nicknameMax,
  totalStars,
  totalPoints,
  onDraftChange,
  onSave,
  compact = false,
}: ScoreBoardProps) => {
  const total = LEVELS.length;
  return (
    <div className={`score-board ${compact ? 'compact' : ''}`}>
      <h3 className="score-board-title">🏆 Score</h3>
      {!nickname ? (
        <div className="score-nickname">
          <label htmlFor="nickname-input">Tu apodo:</label>
          <input
            id="nickname-input"
            type="text"
            maxLength={nicknameMax}
            value={nicknameDraft}
            onChange={e => onDraftChange(e.target.value)}
            placeholder="Apodo corto"
            className="nickname-input"
          />
          <button onClick={onSave} disabled={!nicknameDraft.trim()} className="btn-nickname">
            Guardar
          </button>
        </div>
      ) : (
        <p className="score-player">Jugador: <strong>{nickname}</strong></p>
      )}
      <ul className="score-rows">
        {LEVELS.map(level => {
          const stars = gameState.scores[level.id] || 0;
          const points = gameState.points[level.id] || 0;
          return (
            <li key={level.id}>
              <span className="score-level">Nivel {level.id}</span>
              <span className="score-stars">
                {stars > 0 ? '★'.repeat(stars) + '☆'.repeat(3 - stars) : '—'}
              </span>
              <span className="score-points">{points > 0 ? `${points} pts` : '—'}</span>
            </li>
          );
        })}
      </ul>
      <p className="score-total">
        Total: <strong>{totalStars}★ / {total * 3}</strong>
        <span className="score-total-points">{totalPoints} pts</span>
      </p>
    </div>
  );
};