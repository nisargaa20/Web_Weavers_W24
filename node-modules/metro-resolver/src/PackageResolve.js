"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true,
});
exports.getPackageEntryPoint = getPackageEntryPoint;
exports.redirectModulePath = redirectModulePath;
var _toPosixPath = _interopRequireDefault(require("./utils/toPosixPath"));
var _path = _interopRequireDefault(require("path"));
function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 * @format
 * @oncall react_native
 */

/**
 * Resolve the main entry point subpath for a package.
 *
 * Implements legacy (non-exports) package resolution behaviour based on the
 * ["browser" field spec](https://github.com/defunctzombie/package-browser-field-spec).
 */
function getPackageEntryPoint(context, packageInfo, platform) {
  const { mainFields } = context;
  const pkg = packageInfo.packageJson;
  let main = "index";
  for (const name of mainFields) {
    if (typeof pkg[name] === "string" && pkg[name].length) {
      main = pkg[name];
      break;
    }
  }

  // NOTE: Additional variants are used when checking for subpath replacements
  // against the main entry point. This inconsistent with those matched by
  // `redirectModulePath`, but we are preserving this long-standing behaviour.
  const variants = [
    main,
    main.slice(0, 2) === "./" ? main.slice(2) : "./" + main,
  ].flatMap((variant) => [
    variant,
    variant + ".js",
    variant + ".json",
    variant.replace(/(\.js|\.json)$/, ""),
  ]);
  const replacement = matchSubpathFromMainFields(variants, pkg, mainFields);
  if (typeof replacement === "string") {
    return replacement;
  }
  return main;
}

/**
 * Get the resolved file path for the given import specifier based on any
 * `package.json` rules. Returns `false` if the module should be
 * [ignored](https://github.com/defunctzombie/package-browser-field-spec#ignore-a-module),
 * and returns the original path if no `package.json` mapping is matched. Does
 * not test file existence.
 *
 * Implements legacy (non-exports) package resolution behaviour based on the
 * ["browser" field spec](https://github.com/defunctzombie/package-browser-field-spec).
 *
 * This is the default implementation of `context.redirectModulePath`.
 */
function redirectModulePath(
  context,
  /**
   * The module path being imported. This may be:
   *
   * - A relative specifier (beginning with '.'), which may be redirected by a
   *   `package.json` file local to `context.originModulePath`.
   *     - Note: A path begining with '/' is treated as an absolute specifier
   *       (non-standard).
   * - A bare specifier (e.g. 'some-pkg', 'some-pkg/foo'), which may be
   *   redirected by `package.json` rules in the containing package.
   * - An absolute specifier, which may be redirected by `package.json` rules
   *   in the containing package (non-standard, "browser" spec only).
   *
   * See https://nodejs.org/docs/latest-v19.x/api/esm.html#import-specifiers
   */
  modulePath
) {
  const { getPackageForModule, mainFields, originModulePath } = context;
  const containingPackage = getPackageForModule(
    _path.default.isAbsolute(modulePath) ? modulePath : originModulePath
  );
  if (containingPackage == null) {
    // No package.json rules apply
    return modulePath;
  }
  let redirectedPath;
  if (modulePath.startsWith(".") || _path.default.isAbsolute(modulePath)) {
    const packageRelativeModulePath = _path.default.relative(
      containingPackage.rootPath,
      _path.default.resolve(_path.default.dirname(originModulePath), modulePath)
    );
    redirectedPath = matchSubpathFromMainFields(
      // Use prefixed POSIX path for lookup in package.json
      "./" + (0, _toPosixPath.default)(packageRelativeModulePath),
      containingPackage.packageJson,
      mainFields
    );
    if (typeof redirectedPath === "string") {
      // BRITTLE ASSUMPTION: This is always treated as a package-relative path
      // and is converted back, even if the redirected path is a specifier
      // referring to another package.
      redirectedPath = _path.default.resolve(
        containingPackage.rootPath,
        redirectedPath
      );
    }
  } else {
    // Otherwise, `modulePath` may be an unprefixed relative path or a bare
    // specifier (can also be an absolute specifier prefixed with a URL scheme).
    // This is used only by the "browser" spec.
    redirectedPath = matchSubpathFromMainFields(
      modulePath,
      containingPackage.packageJson,
      mainFields
    );
  }
  if (redirectedPath != null) {
    return redirectedPath;
  }
  return modulePath;
}

/**
 * Get the mapped replacement for the given subpath defined by matching
 * `mainFields` entries in the passed `package.json`
 * (https://github.com/defunctzombie/package-browser-field-spec#replace-specific-files---advanced).
 *
 * Returns either:
 * - A `string` with the matched replacement subpath.
 * - `false`, indicating the module should be ignored.
 * - `null` when there is no entry for the subpath.
 */
function matchSubpathFromMainFields(
  /**
   * The subpath, or set of subpath variants, to match. Can be either a
   * package-relative subpath (beginning with '.') or a bare import specifier
   * which may replace a module in another package.
   */
  subpath,
  pkg,
  mainFields
) {
  const fieldValues = mainFields
    .map((name) => pkg[name])
    .filter((value) => value != null && typeof value !== "string");
  if (!fieldValues.length) {
    return null;
  }
  const replacements = Object.assign({}, ...fieldValues.reverse());
  const variants = Array.isArray(subpath)
    ? subpath
    : expandSubpathVariants(subpath);
  for (const variant of variants) {
    const replacement = replacements[variant];
    if (replacement != null) {
      return replacement;
    }
  }
  return null;
}

/**
 * Get the expanded variants for a given subpath to try against mappings in
 * `package.json`. This is unique to "main" and the "browser" spec.
 */
function expandSubpathVariants(subpath) {
  return [subpath, subpath + ".js", subpath + ".json"];
}
