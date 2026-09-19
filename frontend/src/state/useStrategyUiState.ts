import type { Dispatch, SetStateAction } from 'react';
import type { Workspace } from './useWorkspace';

/** View choices belong to the tab, just like its editable plan. */
export function useStrategyUiState<T>(w:Workspace,key:string,initial:T):[T,Dispatch<SetStateAction<T>>] {
 return [(w.ui[key] as T)??initial,value=>w.setUi(key,value,initial)];
}
