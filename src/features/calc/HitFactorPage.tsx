// Калькулятор хит-фактора: зоны → очки → HF; обратный расчёт от цели.

import { useState } from 'preact/hooks';
import { plural } from '../../app/i18n';
import { Segmented } from '../../ui/Segmented';
import { zonesToPoints, hitFactor, requiredTime, requiredPoints, type Power, type Zone, type ZoneCounts } from './hitFactor';

const ZONE_LABELS: Record<Zone, string> = {
  A: 'зона A',
  C: 'зона C',
  D: 'зона D',
  steel: 'сталь',
};

function ZoneRow(props: { label: string; value: number; onChange: (v: number) => void }) {
  // попадания — целые: дробное «2.5» читаем как 2, отрицательное — 0
  const set = (v: number) => props.onChange(Math.max(0, Math.floor(v)));
  return (
    <div class="hf-zone">
      <span class="hf-zone__label">{props.label}</span>
      <button type="button" class="btn hf-zone__minus" aria-label={`${props.label}: меньше`} onClick={() => set(props.value - 1)}>
        −
      </button>
      <input
        type="number"
        min={0}
        aria-label={props.label}
        value={props.value}
        onInput={(e) => {
          const v = (e.target as HTMLInputElement).value;
          set(v === '' ? 0 : Number(v));
        }}
      />
      <button type="button" class="btn hf-zone__plus" aria-label={`${props.label}: больше`} onClick={() => set(props.value + 1)}>
        +
      </button>
    </div>
  );
}

export function HitFactorPage() {
  const [power, setPower] = useState<Power>('minor');
  const [counts, setCounts] = useState<ZoneCounts>({ A: 0, C: 0, D: 0, steel: 0 });
  const [time, setTime] = useState<number | ''>('');
  const [target, setTarget] = useState<number | ''>('');

  const points = zonesToPoints(counts, power);
  const hf = time !== '' && time > 0 ? hitFactor(points, time) : null;
  const targetHf = target !== '' && target > 0 ? target : null;
  const needPoints = targetHf != null && time !== '' && time > 0 ? requiredPoints(time, targetHf) : null;
  const needTime = targetHf != null && points > 0 ? requiredTime(points, targetHf) : null;

  return (
    <section class="hf">
      <h2>Калькулятор хит-фактора</h2>
      <p class="hf__hint">Хит-фактор — очки за секунду: скорость, не потерявшая точность.</p>

      <div class="hf__panel">
        <Segmented
          ariaLabel="мощность"
          value={power}
          options={[
            { value: 'minor' as const, label: 'minor' },
            { value: 'major' as const, label: 'major' },
          ]}
          onChange={setPower}
        />

        <div class="hf-zones">
          {(Object.keys(ZONE_LABELS) as Zone[]).map((z) => (
            <ZoneRow
              key={z}
              label={ZONE_LABELS[z]}
              value={counts[z]}
              onChange={(v) => setCounts((c) => ({ ...c, [z]: v }))}
            />
          ))}
        </div>

        <p class="hf__points">
          очки: <strong>{points}</strong>
        </p>

        <label class="hf__field">
          Время, с
          <input
            type="number"
            min={0}
            step={0.1}
            value={time}
            onInput={(e) => {
              const v = (e.target as HTMLInputElement).value;
              setTime(v === '' ? '' : Number(v));
            }}
          />
        </label>

        <p class="hf__result" role="status">
          {hf != null ? (
            <>
              хит-фактор <strong>{hf.toFixed(2)}</strong>
            </>
          ) : (
            'введи время'
          )}
        </p>

        <label class="hf__field">
          Целевой HF
          <input
            type="number"
            min={0}
            step={0.5}
            value={target}
            onInput={(e) => {
              const v = (e.target as HTMLInputElement).value;
              setTarget(v === '' ? '' : Number(v));
            }}
          />
        </label>

        {(needPoints != null || needTime != null) && (
          <p class="hf__target">
            {needPoints != null && (
              <>нужно {needPoints} {plural(needPoints, 'очко', 'очка', 'очков')} за это время</>
            )}
            {needPoints != null && needTime != null && <> · или </>}
            {needTime != null && <>уложиться за {needTime.toFixed(2)} с</>}
          </p>
        )}
      </div>
    </section>
  );
}
