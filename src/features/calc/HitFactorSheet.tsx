// Лист подсчёта хит-фактора в карточке упражнения — как на бланках T-Rex и в Range Day:
// вводятся времена серий и попадания по зонам, очки и хит-фактор считаются сами.

import { useState } from 'preact/hooks';
import type { Drill, ZonePrices } from '../../data/types';
import {
  hitFactor,
  sheetPoints,
  DEFAULT_ZONE_PRICES,
  type SheetColumn,
  type SheetRow,
} from './hitFactor';

const COLUMNS: SheetColumn[] = ['A', 'C', 'D', 'M', 'NS'];
const PRICE_NAMES: Record<SheetColumn, string> = { A: 'A', C: 'C', D: 'D', M: 'промах', NS: 'ношот' };
const PRICE_KEY: Record<SheetColumn, keyof ZonePrices> = { A: 'A', C: 'C', D: 'D', M: 'miss', NS: 'noShoot' };

/** Целое ≥ 0 из поля: пустое, минус и дробь не проходят. */
const count = (v: string) => Math.max(0, Math.floor(Number(v) || 0));
/** Секунды из поля: пустое или незавершённый ввод («1.») не мешают считать. */
const seconds = (v: string) => (v.trim() === '' ? 0 : Number(v) || 0);
/** Цена зоны из поля: штрафы отрицательные, пустое поле — 0. */
const price = (v: string) => Number(v) || 0;
// поля хранят сырые строки: число в state «съедало» бы точку при наборе 1.25
type Raw<T extends PropertyKey> = Record<T, string>;

export function HitFactorSheet(props: { drill: Drill }) {
  const { drill } = props;
  const prices = { ...DEFAULT_ZONE_PRICES, ...drill.scoring.zones };
  const strings = drill.scoring.strings ?? 1;
  const targets = Math.max(
    1,
    drill.layout?.targets.length ?? drill.targets.reduce((s, t) => s + t.count, 0),
  );

  const [times, setTimes] = useState<string[]>(() => Array.from({ length: strings }, () => ''));
  const [rows, setRows] = useState<Raw<SheetColumn>[]>(() =>
    Array.from({ length: targets }, () => ({ A: '', C: '', D: '', M: '', NS: '' })),
  );
  // цены зон — поля со значениями бланка (без них — общими): свои вводятся на месте
  const [priceInputs, setPriceInputs] = useState<Raw<keyof ZonePrices>>(() => ({
    A: String(prices.A),
    C: String(prices.C),
    D: String(prices.D),
    miss: String(prices.miss),
    noShoot: String(prices.noShoot),
  }));
  const effective: Required<ZonePrices> = {
    A: price(priceInputs.A),
    C: price(priceInputs.C),
    D: price(priceInputs.D),
    miss: price(priceInputs.miss),
    noShoot: price(priceInputs.noShoot),
  };

  const totalTime = times.reduce((s, v) => s + seconds(v), 0);
  const points = sheetPoints(
    rows.map((r) => ({ A: count(r.A), C: count(r.C), D: count(r.D), M: count(r.M), NS: count(r.NS) })),
    effective,
  );
  const hf = totalTime > 0 ? hitFactor(points, totalTime) : null;

  const input = (
    label: string,
    value: string,
    onInput: (v: string) => void,
    mode: 'numeric' | 'decimal' | 'price',
  ) => (
    <input
      type="number"
      min={mode === 'price' ? undefined : 0}
      step={mode === 'decimal' ? 0.01 : 1}
      inputmode={mode === 'decimal' ? 'decimal' : 'numeric'}
      aria-label={label}
      value={value}
      onInput={(e) => onInput((e.target as HTMLInputElement).value)}
    />
  );

  return (
    <div class="hfsheet">
      {strings > 1 ? (
        <div class="hfsheet__times">
          {times.map((v, i) => (
            <label key={i} class="hfsheet__field">
              Серия {i + 1}
              {input(`Серия ${i + 1}, время, с`, v, (next) => setTimes((t) => t.map((x, k) => (k === i ? next : x))), 'decimal')}
            </label>
          ))}
        </div>
      ) : (
        <label class="hfsheet__field">
          Время, с
          {input('Время, с', times[0] ?? '', (next) => setTimes([next]), 'decimal')}
        </label>
      )}

      <p class="hfsheet__time">
        Общее время: <strong>{totalTime.toFixed(2)}</strong> с
      </p>

      <table class="hfsheet__table">
        <thead>
          <tr>
            <th scope="col">Мишень</th>
            {COLUMNS.map((c) => (
              <th key={c} scope="col">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ti) => (
            <tr key={ti}>
              <th scope="row">Мишень {ti + 1}</th>
              {COLUMNS.map((c) => (
                <td key={c}>
                  {input(
                    `Мишень ${ti + 1}, зона ${c}`,
                    row[c],
                    (next) => setRows((r) => r.map((x, k) => (k === ti ? { ...x, [c]: next } : x))),
                    'numeric',
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <p class="hfsheet__points">
        Очки: <strong>{points}</strong>
      </p>
      <p class="hfsheet__hf" role="status">
        Хит-фактор: {hf != null ? <strong>{hf.toFixed(2)}</strong> : 'введи время'}
      </p>

      <p class="hfsheet__time">Цены зон — можно поменять на свои</p>
      <div class="hfsheet__prices">
        {COLUMNS.map((c) => (
          <label key={c} class="hfsheet__field">
            {PRICE_NAMES[c]}
            {input(
              `Цена: ${PRICE_NAMES[c]}`,
              priceInputs[PRICE_KEY[c]],
              (next) => setPriceInputs((p) => ({ ...p, [PRICE_KEY[c]]: next })),
              'price',
            )}
          </label>
        ))}
      </div>
    </div>
  );
}
