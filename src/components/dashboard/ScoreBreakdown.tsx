'use client';

import ProgressBar from './ProgressBar';

export interface ScoreDimension {
  label: string;
  score: number;
  max: number;
}

export interface ScoreBreakdownProps {
  dimensions: ScoreDimension[];
}

/**
 * Renders a list of score dimensions with labels and progress bars.
 * Each dimension shows the label, a "score/max" value, and a `<ProgressBar>`.
 */
export default function ScoreBreakdown({ dimensions }: ScoreBreakdownProps) {
  return (
    <div className="score-breakdown" role="list" aria-label="Score breakdown">
      {dimensions.map((d, i) => (
        <div key={i} className="score-dimension">
          <div className="score-dim-header">
            <span className="score-dim-label">{d.label}</span>
            <span className="score-dim-val">
              {d.score}/{d.max}
            </span>
          </div>
          <ProgressBar value={d.score} max={d.max} color="#00f2ff" />
        </div>
      ))}
    </div>
  );
}
