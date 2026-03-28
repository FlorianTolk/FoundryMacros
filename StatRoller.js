/**
 * Generates character stats and outputs the table result.
 * Author: @Kekilla#7036 & KrishMero1792
 * Fixed: Roll.evaluate() is now properly awaited for Foundry v11+
 */

// Formula for rolling
const statString = '4d6kh3';
// Times to roll those stats
const numRolls = 6;

//////////////////////////////////////////
// Don't touch anything below this line //
//////////////////////////////////////////

// Evaluate all rolls asynchronously — required in Foundry v11+
// {async: false} is deprecated and leaves dice data undefined
const stats = await Promise.all(
  Array(numRolls).fill(0).map(() => new Roll(statString).evaluate())
);

// Pull dice metadata from the first roll to build headers + color thresholds
const rollData  = stats[0].dice[0];
const { faces, values: keptRolls, results: rolls } = rollData;

// Calculate expected total range for color-coding the Total column
const totalAverage   = (faces / 2 + 1) * keptRolls.length;
const totalDeviation = faces / 2;
const totalLow       = Math.ceil(totalAverage - totalDeviation);
const totalHigh      = Math.ceil(totalAverage + totalDeviation);

// Build the column headers — one per die rolled (e.g. D1, D2, D3, D4)
const header = rolls.map((roll, index) => `<th>D${index + 1}</th>`).join('');

// Build one table row per stat roll
let tableRows = '';
let finalSum  = 0;

for (let { terms, total } of stats) {
  tableRows += `<tr style="text-align:center">`;

  // Each individual die result — struck through and grayed if discarded (the dropped lowest)
  tableRows += terms[0].results
    .map(({ result, discarded }) =>
      `<td style="${colorSetter(result, 1, faces, discarded)}">${result}</td>`
    )
    .join('');

  // The kept total for this stat row, color-coded by how good it is
  tableRows += `<td style="border-left:1px solid #000; ${colorSetter(total, totalLow, totalHigh)}">${total}</td></tr>`;

  finalSum += total;
}

// Shared style helpers
const colspan = `colspan="${rolls.length + 1}"`;
const center  = `text-align:center;`;

// Assemble the full chat card HTML
let content = `
  <table>
    <tr>
      <td ${colspan}>
        <h2 style="margin-bottom:0; ${center}">New Ability Scores</h2>
        <div style="margin-bottom:0.5rem; ${center}">${statString} was rolled ${numRolls} times.</div>
      </td>
    </tr>
    <tr style="${center} border-bottom:1px solid #000">
      ${header}
      <th style="border-left:1px solid #000">Total</th>
    </tr>
    ${tableRows}
    <tr style="border-top:1px solid #000">
      <th colspan="${rolls.length}" style="${center}">Final Sum:</th>
      <th style="${center}">${finalSum}</th>
    </tr>
  </table>
`;

ChatMessage.create({ content });

/**
 * Returns an inline style string based on how high/low a value is.
 * - Discarded dice (dropped lowest) get struck through in gray
 * - Values at or below `low` threshold get colored red
 * - Values at or above `high` threshold get colored green
 * - Everything in between gets no special styling
 */
function colorSetter(number, low, high, discarded) {
  if (discarded === true)  return 'text-decoration:line-through; color:gray';
  if (number   <= low)     return 'color:red';
  if (number   >= high)    return 'color:green';
  return '';
}