/**
 * English names for the wheel's own structural labels (the branches, the
 * rings and the groups the layout makes up). Names of bodies stay Dutch, as
 * everywhere on the site; only words the wheel itself writes are translated.
 */

import type { WheelModel } from "./wheel";

export const WHEEL_TITLES_EN: Record<string, string> = {
  "Wetgevende macht": "Legislative branch",
  "Uitvoerende macht": "Executive branch",
  Advies: "Advice",
  "Rechtspraak en controle": "Judiciary and oversight",
  Rechtspraak: "Judiciary",
  Regering: "Government",
  Ministeries: "Ministries",
  Commissies: "Committees",
  "Advies en planbureaus": "Advisory councils and planning bureaus",
  "Hoge Colleges": "High Councils of State",
  Gerechtshoven: "Courts of appeal",
  Rechtbanken: "District courts",
  "Bijzondere colleges en OM": "Special courts and the Public Prosecution Service",
  "Provincies en gemeenten": "Provinces and municipalities",
  Waterschappen: "Water boards",
  "Caribisch Nederland": "Caribbean Netherlands",
  Koninkrijk: "Kingdom",
};

/** The model with its structural labels in English; ids, angles and radii are untouched. */
export function localizeWheelModel(model: WheelModel, locale: "nl" | "en"): WheelModel {
  if (locale !== "en") return model;
  const label = (title: string) => WHEEL_TITLES_EN[title] ?? title;
  return {
    ...model,
    cells: model.cells.map((cell) => ({ ...cell, title: label(cell.title) })),
    groups: model.groups.map((group) => ({ ...group, title: label(group.title) })),
    wedges: model.wedges.map((wedge) => ({ ...wedge, title: label(wedge.title) })),
  };
}
