// Конвертеры: м↔ярды, граны↔граммы, угловая поправка MOA/MIL → см на дистанции.

import { useState } from 'preact/hooks';
import { Segmented } from '../../ui/Segmented';
import { mToYd, ydToM, gnToG, gToGn, angleToCm } from './converters';

const r2 = (x: number) => String(Math.round(x * 100) / 100);

// Пара с двусторонним пересчётом: обе стороны — строки, чтобы не съедать точку при вводе.
function ConvertPair(props: {
  labelA: string;
  labelB: string;
  initialA: string;
  aToB: (x: number) => number;
  bToA: (x: number) => number;
}) {
  const [a, setA] = useState(props.initialA);
  const [b, setB] = useState(r2(props.aToB(Number(props.initialA))));
  return (
    <div class="conv-row">
      <label class="conv-field">
        {props.labelA}
        <input
          type="number"
          min={0}
          value={a}
          onInput={(e) => {
            const v = (e.target as HTMLInputElement).value;
            setA(v);
            setB(r2(props.aToB(Number(v) || 0)));
          }}
        />
      </label>
      <span class="conv-eq" aria-hidden="true">
        ↔
      </span>
      <label class="conv-field">
        {props.labelB}
        <input
          type="number"
          min={0}
          value={b}
          onInput={(e) => {
            const v = (e.target as HTMLInputElement).value;
            setB(v);
            setA(r2(props.bToA(Number(v) || 0)));
          }}
        />
      </label>
    </div>
  );
}

function AngleCard() {
  const [angle, setAngle] = useState('1');
  const [unit, setUnit] = useState<'moa' | 'mil'>('mil');
  const [dist, setDist] = useState('100');
  const cm = angleToCm(Number(angle) || 0, unit, Number(dist) || 0);
  return (
    <div class="conv-row">
      <label class="conv-field">
        угол
        <input
          type="number"
          min={0}
          step={0.5}
          value={angle}
          onInput={(e) => setAngle((e.target as HTMLInputElement).value)}
        />
      </label>
      <Segmented
        ariaLabel="единицы угла"
        value={unit}
        options={[
          { value: 'moa' as const, label: 'MOA' },
          { value: 'mil' as const, label: 'MIL' },
        ]}
        onChange={setUnit}
      />
      <label class="conv-field">
        дистанция, м
        <input
          type="number"
          min={0}
          value={dist}
          onInput={(e) => setDist((e.target as HTMLInputElement).value)}
        />
      </label>
      <p class="conv-result" role="status">
        = <strong>{r2(cm)}</strong> см
      </p>
    </div>
  );
}

export function ConvertersPage() {
  return (
    <section class="conv">
      <h2>Конвертеры</h2>
      <p class="page-hint">Ярды — из американских схем, граны — из reloading-таблиц, MIL/MOA — поправки прицела.</p>
      <div class="conv__panel">
        <ConvertPair labelA="метры" labelB="ярды" initialA="100" aToB={mToYd} bToA={ydToM} />
        <ConvertPair labelA="граны" labelB="граммы" initialA="125" aToB={gnToG} bToA={gToGn} />
        <AngleCard />
      </div>
    </section>
  );
}
