---
title: "Using Excel-style functions to create table calculations"
source: "https://docs.omni.co/analyze-explore/calculations/index"
author:
published:
created: 2026-05-21
description: "Create formulas that manipulate and calculate data with Excel-style functions."
tags:
  - "clippings"
---
Table calculations create ad hoc metrics that are performed post query processing on the result set, similar to Excel or Google Sheets. They can build contextual metrics like percent of row or column, period over period changes, or other calculations to customize analyses or visualizations.

## Table calculations in Omni

What are functions?

Functions are predefined formulas designed to make calculations on values easier. For example:

```text
NOW()           # Returns the current date and time, ex: 2025-05-09 18:23:30.521
TODAY()         # Returns the current date, ex: 2025-05-09
```

What are arguments?

Some functions can accept **arguments**, which is the input or information provided to the function. In the following example, the arguments are `1, 2, 3`:

```text
SUM(1,2,3)         # Returns 6
```

Arguments can be several types, which can be thought of as the compositional building blocks of calculations:

- **String literals** - Strings of text, which must be wrapped in double quotes. For example: `"Hello, Blobby!"`
- **Number literals** - Numbers, such as `1` or `14`. Can be used alone or as arguments.
- **Logical literals** - Boolean values (`TRUE`, `FALSE`). **Note**: Must be all caps or the values will be interpreted as a cell reference.
- **Unary Operators / Negation** - Negates (`-`) or adds (`+`) a value. Can be thought of as operators with only a right operand. For example:
	```text
	-daily_budget     # Returns the negative value of daily_budget, ex: -500
	```
	**Note**: The `+` operator can also be used as a unary. However, Omni typically ignores it because `+1` and `1` are logically equivalent.
- **Cell references** - Points to a specific cell in a dataset. The row can be omitted to reference only the column.
	Omni interprets cell references relative to the first row of data. Calculations will be applied to all following rows with the number changed to offset how many rows down you are.
	```text
	C1                    # Reference column C in row 1C2 + 10               # Reference column C in row 2users.count + 10      # Reference users.count column
	```
- **Cell range references** - Compound cell reference that describes a span between one cell and another. Can be used to reference an entire column or a subset of the column’s data. **Note**: Cell ranges are inclusive.
	```text
	C1:C5                 # Include cells C1,C2,C3,C4,C5C:C                   # Include all of column C
	```

What functions does Omni support?

Refer to the [Omni supported functions reference](https://docs.omni.co/analyze-explore/calculations/all) for a list of the functions Omni currently supports.

Are Omni functions the same as Excel or Google Sheets?

Omni aims to be compatible with Excel or Google Sheets wherever possible. The Google Sheets documentation included in the [Omni supported functions reference](https://docs.omni.co/analyze-explore/calculations/all) is useful for enhancing your understanding of Omni’s functions.

**Note**: For some functions, there are some differences between Omni’s implementation and Google Sheets’. Refer to the reference for the specific Omni function for more information.

What are the OMNI\_PIVOT functions in the query's SQL?

There are some other functions you may see in the SQL that are not meant for end-user use, but help make the SQL blocks easier to parse in normal usage:

![](https://mintcdn.com/omni-e7402367/VJSO_TqxWchd4y9s/images/docs/querying-and-sql/assets/images/pivot-sql-e25a960bdd4d0622d137ad212ff256fe.png?w=2500&fit=max&auto=format&n=VJSO_TqxWchd4y9s&q=85&s=42c394c500c6280acb0f447e587ef573)

The `OMNI_PIVOT_ROW(dimensions)` and `OMNI_PIVOT(column_limit, pivots)` structure the pivot table experience.

- `OMNI_PIVOT_ROW` sets the query columns outside the pivot
- `OMNI_PIVOT` sets the query columns to pivot, along with a limit on columns

## Create table calculations

There are a few ways to create calculations in Omni:

Each approach can use all of [Omni’s supported functions](https://docs.omni.co/analyze-explore/calculations/all). Additionally, regardless of how the calculation is created, calculations can be [renamed, formatted](#rename-and-format-calculations), and [added to the workbook](#promote-table-calculations).

Before you get started:

- Make sure that the query includes the fields you want to use in the calculation
- Keep in mind that all alphabetic characters must be wrapped in double quotes (`"`) unless referring to a specific cell or column. For example: `"Hello, Blobby!"`. Single quotes are not valid for wrapping strings in Omni.

### Quick calculations

Quick calculations, such as percent of total, can be used on **numeric** data in a workbook results table in the query builder or SQL editor. They can also be used across pivots. For example, a running total for a row.

To create a quick calculation:

The new column will be named using the convention `<column_name> + <quick_calculation>`, but you can [rename it](#rename-and-format-calculations) if needed.

### AI-generated

With Omni’s AI, you can write complex, Excel-like formulas using natural language. Having AI create calculated fields for you reduces the time you’d otherwise spend searching for the right syntax and iterating to get it just right.

Check out the [Examples](#examples) section to see some example prompts you can use to create calculations.

### Manually-created calculations

You can also manually create calculations in the results table of a query:

Check out the [Examples](#examples) section to see some of what’s possible, such as how to return nulls or reference column totals.

## Rename and format calculations

In the **Options** for the **Results** table, you can rename or change the formatting for calculations.

You can also rename a calculation by double-clicking the column header and entering a new name:

![](https://mintcdn.com/omni-e7402367/VJSO_TqxWchd4y9s/images/docs/querying-and-sql/assets/images/rename-calculated-field-23aa3a67b7d3dd986d5ca5d44e1d6c6b.png?w=2500&fit=max&auto=format&n=VJSO_TqxWchd4y9s&q=85&s=b49637eaf4827060186ab5df1fa48800)

## Promote table calculations

To reuse a calculation in a workbook, you can promote it to the workbook model. Click the icon in the calculation column’s header, then **Add to workbook**:

![](https://mintcdn.com/omni-e7402367/VJSO_TqxWchd4y9s/images/docs/querying-and-sql/assets/images/promote-to-workbook-bd94c8c252435ee2473d71b8ec618ccb.png?w=2500&fit=max&auto=format&n=VJSO_TqxWchd4y9s&q=85&s=3f9c892a851ef3e3ce3a69a134dd6d16)

Once added to the workbook model, you can then promote the calculation to the [shared model](https://docs.omni.co/modeling/develop/model-management#shared-model-promotion).

Some limitations do exist depending on the type of calculation, such as calculations based on other calculations or those that include a range. This is because some calculations depend on the shape of a specific result set.

For example, a seven-day moving average that works when data is grouped by day, but not if the grouping is by month.

## Duplicate calculations

To create a copy of an existing calculation, click the icon in the calculation column’s header, then **Duplicate**.

This creates a new column with a copy of the calculation, which you can then modify. This is useful when you want to create variations of an existing calculation, such as testing a formula change or creating similar calculations for different fields.

## Examples

Return null values

To return a `null` value, use `1/0` as the calculation. Nulls will display as blanks.

![](https://mintcdn.com/omni-e7402367/VJSO_TqxWchd4y9s/images/docs/querying-and-sql/assets/images/null-value-example-d066993ff80a55f8ec4a95a862fddd8f.png?w=2500&fit=max&auto=format&n=VJSO_TqxWchd4y9s&q=85&s=6068068e0c4838e564bc55c1dcf96a22)

Total references

Using row and column totals can be effective for more complex calculations across rows or columns independently. These aggregates can be referenced in calculations when they are activated for queries, which you can do in the **Options** menu for the **Results** table.

![](https://mintcdn.com/omni-e7402367/VJSO_TqxWchd4y9s/images/docs/querying-and-sql/assets/images/totals-calcs-fa50144c2d27f64b4df3ba5bd4b2939f.png?w=2500&fit=max&auto=format&n=VJSO_TqxWchd4y9s&q=85&s=b97d07345eb764483e13a6bb4d102365)

\# Percent of row ${users.count} \* 100.0 / ${users.count:row\_total}\`.

This example references:

- **Column total** `${users.count:column_total}`
- **Row total** - `${users.count:row_total}`
- **Grand total (columns and rows, lower right**) - `${users.count:grand_total}`

These can also be chained with other functions. For example:

To reference these totals within table calculations:

- **Column total** `<ROW_LETTER>_TOTAL`
- **Row total** `<ROW_LETTER>_ROW_TOTAL`
- **Grand total** `<ROW_LETTER>GRAND_TOTAL`

Free text values

Calculations can also contain free text - just leave out the equals sign when creating the calculation. When you don’t include the equals sign, Omni will not treat the cell’s value as a formula.

To create this type of calculation, add a new column to the table and then enter text in the cells.

Free-text values can be used to cross-reference columns or cells in other workbook tabs. To do this, create a new column, enter an equal sign, and \` (backtick) to pull up the tab names in the cell:

![](https://mintcdn.com/omni-e7402367/VJSO_TqxWchd4y9s/images/docs/querying-and-sql/assets/images/cross-referencing-tabs-7a235837cca2be0674ab01b4a6c3ba3a.png?w=2500&fit=max&auto=format&n=VJSO_TqxWchd4y9s&q=85&s=dbc350945d770c13f6bf147d8e1c060f)

AI-generated: two letter abbreviations for US states

Using IFS, create a formula that uses the standard two letter abbreviations for US states. For District of Columbia, use DC as the abbreviation.

In the example query, the `A` column contains the full name of the state. For example, `California` or `Pennsylvania`.

```sql
=IFS(A1 = "Alabama", "AL", A1 = "Alaska", "AK", A1 = "Arizona", "AZ", A1 = "Arkansas", "AR", A1 = "California", "CA", A1 = "Colorado", "CO", A1 = "Connecticut", "CT", A1 = "Delaware", "DE", A1 = "Florida", "FL", A1 = "Georgia", "GA", A1 = "Hawaii", "HI", A1 = "Idaho", "ID", A1 = "Illinois", "IL", A1 = "Indiana", "IN", A1 = "Iowa", "IA", A1 = "Kansas", "KS", A1 = "Kentucky", "KY", A1 = "Louisiana", "LA", A1 = "Maine", "ME", A1 = "Maryland", "MD", A1 = "Massachusetts", "MA", A1 = "Michigan", "MI", A1 = "Minnesota", "MN", A1 = "Mississippi", "MS", A1 = "Missouri", "MO", A1 = "Montana", "MT", A1 = "Nebraska", "NE", A1 = "Nevada", "NV", A1 = "New Hampshire", "NH", A1 = "New Jersey", "NJ", A1 = "New Mexico", "NM", A1 = "New York", "NY", A1 = "North Carolina", "NC", A1 = "North Dakota", "ND", A1 = "Ohio", "OH", A1 = "Oklahoma", "OK", A1 = "Oregon", "OR", A1 = "Pennsylvania", "PA", A1 = "Rhode Island", "RI", A1 = "South Carolina", "SC", A1 = "South Dakota", "SD", A1 = "Tennessee", "TN", A1 = "Texas", "TX", A1 = "Utah", "UT", A1 = "Vermont", "VT", A1 = "Virginia", "VA", A1 = "Washington", "WA", A1 = "West Virginia", "WV", A1 = "Wisconsin", "WI", A1 = "Wyoming", "WY", A1 = "District of Columbia", "DC")
```

**Results table**

| State | State Abbreviation |
| --- | --- |
| Alabama | AL |
| Alaska | AK |
| Arizona | AZ |
| Arkansas | AR |
| … | … |

AI-generated: extract domain from email

Give me the domain from the email column.

In the example query, the `A` column contains an email address. For example, `blobby@blobsrus.com`.

```sql
=RIGHT(A1, LEN(A1) - FIND("@", A1))
```

**Results table**

| Email | Email Domain |
| --- | --- |
| `blobby@blobsrus.com` | blobsrus.com |
| `blobross@gmail.com` | gmail.com |
| `bobbyparton@blobbyworld.co` | blobbyworld.co |

AI-generated: identify a date as a weekday or a weekend

Tell me if COLUMN\_A is a weekday or a weekend.

If you receive an error for the above prompt, try this instead:

Tell me if COLUMN\_A is a weekday or a weekend. If using WEEKDAY, only provide a date as an argument.

In the example query, the `A` column contains a timestamp.

```sql
=IF(OR(WEEKDAY(A1)=1,WEEKDAY(A1)=7),"Weekend","Weekday")
```

**Results table**

| Date | Weekday or Weekend |
| --- | --- |
| 2024-12-27 00:25:19.000 | Weekday |
| 2024-09-30 13:11:47.000 | Weekend |
| 2023-04-27 18:59:25.000 | Weekday |
| 2022-05-15 18:02:33.000 | Weekday |