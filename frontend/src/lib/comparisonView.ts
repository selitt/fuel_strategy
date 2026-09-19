import type { Result } from '../api/types';
import { MODEL_START_YEAR, MODEL_END_YEAR, MODEL_HORIZON_DAYS, modelDayFromYearDay, projectTimelineTrace, yearDayFromModelDay } from './daily.js';

export type ComparisonView = {year:number;scenario:'BASE'|'MANDATORY_STRESS';metric:'inventory'|'shortage'|'cost';range:'all'|'year'};
const finite=(value:unknown):value is number=>typeof value==='number'&&Number.isFinite(value);
/** Display-only subtraction of two engine values in the same units. */
export function numericDelta(value:number|undefined,reference:number|undefined):number|undefined {
 return finite(value)&&finite(reference)?value-reference:undefined;
}
/** Equality of the displayed series; gaps are never evidence of equivalence. */
export function equivalentChartSeries(results:Result[],metric:ComparisonView['metric'],range:ComparisonView['range'],year:number):boolean {
 if(results.length<2)return false;
 const start=metric==='cost'?MODEL_START_YEAR:range==='all'?1:modelDayFromYearDay(year,1);
 const end=metric==='cost'?MODEL_END_YEAR:range==='all'?MODEL_HORIZON_DAYS:modelDayFromYearDay(year,365);
 if(start===undefined||end===undefined)return false;
 const rows=results.map(result=>metric==='cost'
  ?(result.financial_breakdown||[]).filter(row=>row.year>=start&&row.year<=end).map(row=>[row.year,row.total] as const)
  :projectTimelineTrace(result,[start,end]).map(row=>[row.model_day,metric==='inventory'?row.closing_inventory_t:row.shortage_t] as const));
 if(rows.some(row=>row.length!==end-start+1||new Set(row.map(([x])=>x)).size!==row.length||row.some(([,v])=>!finite(v))))return false;
 const values=rows.map(row=>new Map(row));
 for(let x=start;x<=end;x++){const value=values[0].get(x);if(!finite(value)||values.some(row=>row.get(x)!==value))return false;}
 return true;
}
/** Navigation only: the plan itself and its decisions stay untouched. */
export function comparisonEditorContext(view:ComparisonView,ui:Record<string,unknown>,primaryScenario='BASE'):Record<string,unknown> {
 const day=yearDayFromModelDay(Number(ui.resultDay)||1)?.day??1;
 return {...ui,supplyYear:view.year,resultDay:modelDayFromYearDay(view.year,day)??1,
  resultChart:view.metric==='cost'?'cost':'inventory',resultRange:view.range==='all'?'overview':'detail',
  dayDetails:view.metric==='shortage',resultSide:view.scenario===primaryScenario?'primary':'other'};
}
export function updateEditorUi(ui:Record<string,unknown>,key:string,value:unknown):Record<string,unknown> {
 const next={...ui,[key]:value};
 if(key==='supplyYear')next.resultDay=modelDayFromYearDay(Number(value),yearDayFromModelDay(Number(ui.resultDay)||1)?.day??1)??ui.resultDay;
 if(key==='resultDay')next.supplyYear=yearDayFromModelDay(Number(value))?.year??ui.supplyYear;
 return next;
}
