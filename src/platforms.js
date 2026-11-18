/** Plataformas de la planilla, de la más usada a la menos usada. */
export function knownPlatforms(games) {
    const count = new Map();
    for (const g of games)
        if (g.platform)
            count.set(g.platform, (count.get(g.platform) ?? 0) + 1);
    return [...count.entries()].sort((a, b) => b[1] - a[1]).map(([p]) => p);
}
