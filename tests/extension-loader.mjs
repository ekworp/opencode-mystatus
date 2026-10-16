export async function resolve(specifier, context, nextResolve) {
  if (
    specifier.startsWith(".") &&
    !specifier.endsWith(".js") &&
    !specifier.endsWith(".json")
  ) {
    try {
      return await nextResolve(`${specifier}.js`, context);
    } catch {
      // Let Node report the original resolution error.
    }
  }

  return nextResolve(specifier, context);
}
