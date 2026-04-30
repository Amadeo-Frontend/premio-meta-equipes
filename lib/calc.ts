export function calcPrizeProgress(baseSemester: number, actualSemester: number, maxPrize: number = 10000) {
  const growthTarget = baseSemester * 0.25
  const achieved = actualSemester - baseSemester

  let progress = achieved / growthTarget
  if (progress < 0) progress = 0
  if (progress > 1) progress = 1

  return {
    progressPercent: progress * 100,      // % da meta de 25%
    dynamicPrize: progress * maxPrize,        // prêmio proporcional
    finalPrize: progress >= 1 ? maxPrize : progress * maxPrize,
    growthTarget,
  }
}
