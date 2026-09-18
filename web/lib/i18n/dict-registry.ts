import type { DictArea } from "./dicts";
import type { DictTable } from "./dicts";
import { COMMON_DICT } from "./dict-common";
import { GRAPH_DICT } from "./dict-graph";
import { POWER_DICT } from "./dict-power";
import { HOME_DICT } from "./dict-home";
import { NEWS_DICT } from "./dict-news";
import { ENTITY_DICT } from "./dict-entity";

export const DICTS: Record<DictArea, DictTable> = {
  common: COMMON_DICT,
  graph: GRAPH_DICT,
  power: POWER_DICT,
  home: HOME_DICT,
  news: NEWS_DICT,
  entity: ENTITY_DICT,
};

export type { DictArea };
