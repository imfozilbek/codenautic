import { describe, expect, it } from "vitest"

import {
    clampScore,
    mapRiskToChipColor,
    mapRiskToLabel,
    resolveIssueCountValue,
    formatOverviewTimestamp,
    createRangeValues,
    padCronValue,
    parseCronNumber,
    isCronManual,
    createRescanScheduleFromCron,
    createCronExpressionFromReschedule,
    getRescanSummaryLabel,
    resolveHealthChipColor,
    resolveHealthLabel,
    isRescanScheduleMode,
} from "@/pages/repository-overview/repository-overview-utils"

describe("clampScore", (): void => {
    it("when score is within range, then returns unchanged", (): void => {
        expect(clampScore(50)).toBe(50)
    })

    it("when score is below 0, then returns 0", (): void => {
        expect(clampScore(-10)).toBe(0)
    })

    it("when score is above 100, then returns 100", (): void => {
        expect(clampScore(150)).toBe(100)
    })

    it("when score is exactly 0, then returns 0", (): void => {
        expect(clampScore(0)).toBe(0)
    })

    it("when score is exactly 100, then returns 100", (): void => {
        expect(clampScore(100)).toBe(100)
    })
})

describe("mapRiskToChipColor", (): void => {
    it("when risk is 'low', then returns 'success'", (): void => {
        expect(mapRiskToChipColor("low")).toBe("success")
    })

    it("when risk is 'high', then returns 'warning'", (): void => {
        expect(mapRiskToChipColor("high")).toBe("warning")
    })

    it("when risk is 'critical', then returns 'danger'", (): void => {
        expect(mapRiskToChipColor("critical")).toBe("danger")
    })
})

describe("mapRiskToLabel", (): void => {
    it("when risk is 'low', then returns 'low'", (): void => {
        expect(mapRiskToLabel("low")).toBe("low")
    })

    it("when risk is 'high', then returns 'high'", (): void => {
        expect(mapRiskToLabel("high")).toBe("high")
    })

    it("when risk is 'critical', then returns 'critical'", (): void => {
        expect(mapRiskToLabel("critical")).toBe("critical")
    })
})

describe("resolveIssueCountValue", (): void => {
    it("when given positive number, then returns floored value", (): void => {
        expect(resolveIssueCountValue(3.7)).toBe(3)
    })

    it("when given negative number, then returns 0", (): void => {
        expect(resolveIssueCountValue(-5)).toBe(0)
    })

    it("when given NaN, then returns 0", (): void => {
        expect(resolveIssueCountValue(NaN)).toBe(0)
    })

    it("when given undefined, then returns 0", (): void => {
        expect(resolveIssueCountValue(undefined)).toBe(0)
    })

    it("when given 0, then returns 0", (): void => {
        expect(resolveIssueCountValue(0)).toBe(0)
    })
})

describe("formatOverviewTimestamp", (): void => {
    it("when given valid ISO string, then returns formatted date", (): void => {
        const result = formatOverviewTimestamp("2024-06-15T10:30:00.000Z")

        expect(result.length).toBeGreaterThan(0)
        expect(result).not.toBe("\u2014")
    })

    it("when given invalid date string, then returns dash", (): void => {
        expect(formatOverviewTimestamp("not-a-date")).toBe("\u2014")
    })
})

describe("createRangeValues", (): void => {
    it("when limit is 5, then returns [0,1,2,3,4]", (): void => {
        expect(createRangeValues(5)).toEqual([0, 1, 2, 3, 4])
    })

    it("when limit is 0, then returns empty array", (): void => {
        expect(createRangeValues(0)).toEqual([])
    })

    it("when limit is 1, then returns [0]", (): void => {
        expect(createRangeValues(1)).toEqual([0])
    })
})

describe("padCronValue", (): void => {
    it("when given single digit, then pads with zero", (): void => {
        expect(padCronValue(5)).toBe("05")
    })

    it("when given two digits, then returns as-is", (): void => {
        expect(padCronValue(15)).toBe("15")
    })

    it("when given 0, then returns '00'", (): void => {
        expect(padCronValue(0)).toBe("00")
    })
})

describe("parseCronNumber", (): void => {
    it("when value is valid within range, then returns parsed number", (): void => {
        expect(parseCronNumber("15", 0, 59, 0)).toBe(15)
    })

    it("when value is below min, then returns fallback", (): void => {
        expect(parseCronNumber("-1", 0, 59, 0)).toBe(0)
    })

    it("when value is above max, then returns fallback", (): void => {
        expect(parseCronNumber("60", 0, 59, 0)).toBe(0)
    })

    it("when value is not a number, then returns fallback", (): void => {
        expect(parseCronNumber("abc", 0, 59, 5)).toBe(5)
    })
})

describe("isCronManual", (): void => {
    it("when expression is 'manual', then returns true", (): void => {
        expect(isCronManual("manual")).toBe(true)
    })

    it("when expression is ' manual ', then returns true", (): void => {
        expect(isCronManual(" manual ")).toBe(true)
    })

    it("when expression is a cron string, then returns false", (): void => {
        expect(isCronManual("0 * * * *")).toBe(false)
    })
})

describe("createRescanScheduleFromCron", (): void => {
    it("when given 'manual', then returns manual mode", (): void => {
        const result = createRescanScheduleFromCron("manual")

        expect(result.mode).toBe("manual")
    })

    it("when given hourly cron, then returns hourly mode", (): void => {
        const result = createRescanScheduleFromCron("30 * * * *")

        expect(result.mode).toBe("hourly")
        expect(result.minute).toBe(30)
    })

    it("when given daily cron, then returns daily mode", (): void => {
        const result = createRescanScheduleFromCron("15 8 * * *")

        expect(result.mode).toBe("daily")
        expect(result.minute).toBe(15)
        expect(result.hour).toBe(8)
    })

    it("when given weekly cron, then returns weekly mode", (): void => {
        const result = createRescanScheduleFromCron("0 9 * * 1")

        expect(result.mode).toBe("weekly")
        expect(result.weekday).toBe(1)
    })

    it("when given non-5-part cron, then returns custom mode", (): void => {
        const result = createRescanScheduleFromCron("*/5 * *")

        expect(result.mode).toBe("custom")
    })
})

describe("createCronExpressionFromReschedule", (): void => {
    it("when mode is manual, then returns 'manual'", (): void => {
        const result = createCronExpressionFromReschedule({
            mode: "manual",
            minute: 0,
            hour: 0,
            weekday: 0,
            customCron: "",
        })

        expect(result).toBe("manual")
    })

    it("when mode is hourly, then returns cron with minute", (): void => {
        const result = createCronExpressionFromReschedule({
            mode: "hourly",
            minute: 30,
            hour: 0,
            weekday: 0,
            customCron: "",
        })

        expect(result).toBe("30 * * * *")
    })

    it("when mode is daily, then returns cron with hour and minute", (): void => {
        const result = createCronExpressionFromReschedule({
            mode: "daily",
            minute: 15,
            hour: 8,
            weekday: 0,
            customCron: "",
        })

        expect(result).toBe("15 8 * * *")
    })

    it("when mode is weekly, then returns full cron", (): void => {
        const result = createCronExpressionFromReschedule({
            mode: "weekly",
            minute: 0,
            hour: 9,
            weekday: 1,
            customCron: "",
        })

        expect(result).toBe("0 9 * * 1")
    })

    it("when mode is custom with empty cron, then returns 'manual'", (): void => {
        const result = createCronExpressionFromReschedule({
            mode: "custom",
            minute: 0,
            hour: 0,
            weekday: 0,
            customCron: "",
        })

        expect(result).toBe("manual")
    })

    it("when mode is custom with value, then returns trimmed cron", (): void => {
        const result = createCronExpressionFromReschedule({
            mode: "custom",
            minute: 0,
            hour: 0,
            weekday: 0,
            customCron: "  */5  *  *  *  *  ",
        })

        expect(result).toBe("*/5 * * * *")
    })
})

describe("getRescanSummaryLabel", (): void => {
    it("when mode is manual, then returns Russian label", (): void => {
        const result = getRescanSummaryLabel({
            mode: "manual",
            minute: 0,
            hour: 0,
            weekday: 0,
            customCron: "",
        })

        expect(result).toContain("По требованию")
    })

    it("when mode is hourly, then returns label with minute", (): void => {
        const result = getRescanSummaryLabel({
            mode: "hourly",
            minute: 15,
            hour: 0,
            weekday: 0,
            customCron: "",
        })

        expect(result).toContain(":15")
    })
})

describe("resolveHealthChipColor", (): void => {
    it("when score >= 85, then returns 'success'", (): void => {
        expect(resolveHealthChipColor(90)).toBe("success")
    })

    it("when score >= 70 and < 85, then returns 'warning'", (): void => {
        expect(resolveHealthChipColor(75)).toBe("warning")
    })

    it("when score < 70, then returns 'danger'", (): void => {
        expect(resolveHealthChipColor(50)).toBe("danger")
    })
})

describe("resolveHealthLabel", (): void => {
    it("when score >= 85, then returns 'Healthy'", (): void => {
        expect(resolveHealthLabel(90)).toBe("Healthy")
    })

    it("when score >= 70, then returns 'Degraded'", (): void => {
        expect(resolveHealthLabel(75)).toBe("Degraded")
    })

    it("when score < 70, then returns 'At risk'", (): void => {
        expect(resolveHealthLabel(50)).toBe("At risk")
    })
})

describe("isRescanScheduleMode", (): void => {
    it("when value is 'manual', then returns true", (): void => {
        expect(isRescanScheduleMode("manual")).toBe(true)
    })

    it("when value is 'hourly', then returns true", (): void => {
        expect(isRescanScheduleMode("hourly")).toBe(true)
    })

    it("when value is unknown, then returns false", (): void => {
        expect(isRescanScheduleMode("biweekly")).toBe(false)
    })
})
