import type { ScoreEntry } from '../types';

interface LeaderboardProps {
  entries: ScoreEntry[];
  totalLevels: number;
  compact?: boolean;
}

export const Leaderboard = ({ entries, totalLevels, compact = false }: LeaderboardProps) => {
  if (entries.length === 0) return null;
  return (
    <div className={`score-board leaderboard ${compact ? 'compact' : ''}`}>
      <h3 className="score-board-title">🏆 Top 5</h3>
      <ol className="leaderboard-list">
        {entries.map((entry, index) => (
          <li key={`${entry.nickname}-${entry.date}`}>
            <span className="leaderboard-rank">{index + 1}º</span>
            <span className="leaderboard-name">{entry.nickname}</span>
            <span className="leaderboard-stars">{entry.stars}/{totalLevels * 3}★</span>
            <span className="leaderboard-score">{entry.score} pts</span>
          </li>
        ))}
      </ol>
    </div>
  );
};