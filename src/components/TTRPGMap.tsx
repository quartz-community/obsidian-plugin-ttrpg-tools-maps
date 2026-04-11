/*
 * Portions of this file are ported from:
 *   zoom-map by Jareika
 *   https://github.com/Jareika/zoom-map
 *   Commit: da748dbcca9247ef26cf596b9e64b0b552fdb175
 *   MIT License — Copyright (c) 2025 Jareika
 */

import type {
  QuartzComponent,
  QuartzComponentConstructor,
  QuartzComponentProps,
} from "@quartz-community/types";

// @ts-expect-error Inline script bundled as string at build time
import script from "./scripts/ttrpg-map.inline.ts";
import style from "./styles/ttrpg-map.scss";

export default ((_opts?: Record<string, unknown>) => {
  const Component: QuartzComponent = (_props: QuartzComponentProps) => {
    return null;
  };
  Component.css = style;
  Component.afterDOMLoaded = script;
  return Component;
}) satisfies QuartzComponentConstructor;
