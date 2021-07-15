import React, {
  LegacyRef,
  memo,
  ReactNode,
  SyntheticEvent,
  useRef,
  useState,
  useEffect,
  useMemo,
  useCallback,
} from "react"
import clsx from "clsx"
import { createStyles, darken, Theme } from "@material-ui/core/styles"
import TableCell from "@material-ui/core/TableCell"
import Paper from "@material-ui/core/Paper"
import {
  AutoSizer,
  CellMeasurer,
  CellMeasurerCache,
  Column,
  SortDirectionType,
  Table as VTable,
  TableCellDataGetter,
  TableHeaderProps,
} from "react-virtualized"
import TablePagination from "@material-ui/core/TablePagination"
import {
  Checkbox,
  IconButton,
  lighten,
  makeStyles,
  MenuItem,
  Popover,
  TableRow,
  TextField,
  Toolbar,
  Tooltip,
  Typography,
} from "@material-ui/core"
import AddIcon from "@material-ui/icons/Add"
import DeleteIcon from "@material-ui/icons/Delete"
import EditIcon from "@material-ui/icons/Edit"
import CheckIcon from "@material-ui/icons/Check"
import ClearIcon from "@material-ui/icons/Clear"
import {
  TableCellProps,
  TableHeaderRowProps,
  TableRowProps,
} from "react-virtualized/dist/es/Table"
import ChevronRightIcon from "@material-ui/icons/ChevronRight"
import { debounce, orderBy } from "lodash"
import ArrowDownwardIcon from "@material-ui/icons/ArrowDownward"
import SaveAltIcon from "@material-ui/icons/SaveAlt"
import { CsvBuilder } from "filefy"
import { jsPDF } from "jspdf"
import InputAdornment from "@material-ui/core/InputAdornment"
import FilterListIcon from "@material-ui/icons/FilterList"

const compareValue = (data: any, filterString: any, index: any) => {
  const filter = filterString.toLowerCase()
  const _filter = filter[filter.length - 1]
  let newData: any = []
  data.forEach((el: any) => {
    const value = index.getter
      ? index.getter(el).toLowerCase()
      : String(el[index.key]).toLowerCase()
    const pureFilter = filter.replace(/\*/g, "")
    const reversePureFilter = filter
      .replace(/\*/g, "")
      .split("")
      .reverse()
      .join("")
    const numberFilter = Number(filter.replace(">", "").replace("<", ""))
    if (filter === "*" || filter === ">" || filter === "<") {
      newData = data
    } else {
      const reverseValue = value.split("").reverse().join("")
      if (filter[0] === "*" && _filter === "*") {
        value.includes(pureFilter) && newData.push(el)
      }
      if (_filter === "*" && filter[0] !== "*") {
        value.startsWith(pureFilter) && newData.push(el)
      }
      if (filter[0] === "*" && _filter !== "*") {
        reverseValue.startsWith(reversePureFilter) && newData.push(el)
      }

      if (filter[0] === ">") {
        Number(value) > numberFilter && newData.push(el)
      }
      if (filter[0] === "<") {
        Number(value) < numberFilter && newData.push(el)
      }
      value === pureFilter && newData.push(el)
    }
  })
  return newData
}
const filterData = (data: any, filters: any, filterIndex: any) => {
  let tempData: any = []
  filters.forEach((filter: any, index: any) => {
    const re = /\s*(?:,|$)\s*/
    if (filter === "") {
      return data
    } else {
      if (filter.includes(",")) {
        tempData = []
        const filterArray = filter
          .trim()
          .split(re)
          .filter((e: any) => e)

        filterArray.forEach((element: any) => {
          tempData = tempData.concat(
            compareValue(data, element, filterIndex[index]),
          )
        })
        if (tempData.length > 0) {
          data = [
            ...new Map(tempData.map((item: any) => [item.id, item])).values(),
          ]
        } else {
          data = tempData
        }

        return data
      } else {
        data = [
          ...new Map(
            compareValue(data, filter, filterIndex[index]).map((item: any) => [
              item.id,
              item,
            ]),
          ).values(),
        ]

        return data
      }
    }
  })
  return data
}

declare module "@material-ui/core/styles/withStyles" {
  // Augment the BaseCSSProperties so that we can control jss-rtl
  interface BaseCSSProperties {
    /*
     * Used to control if the rule-set should be affected by rtl transformation
     */
    flip?: boolean
  }
}

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    flexContainer: {
      display: "flex",
      alignItems: "center",
      boxSizing: "border-box",
    },
    table: {
      "& .ReactVirtualized__Table__headerRow": {
        flip: false,
        paddingRight: theme.direction === "rtl" ? "0 !important" : undefined,
      },
      "& .ReactVirtualized__Table__rowColumn": {
        marginRight: 0,
        marginLeft: 0,
      },
      "& .ReactVirtualized__Table__headerColumn": {
        marginRight: 0,
        marginLeft: 0,
      },
    },
    tableRow: {
      cursor: "pointer",
    },
    tableRowHover: {
      "&:hover": {
        backgroundColor: theme.palette.action.selected,
      },
    },
    tableRowSelected: {
      backgroundColor:
        theme.palette.type === "light"
          ? lighten(theme.palette.primary.main, 0.85)
          : darken(theme.palette.primary.main, 0.45),
      "&:hover": {
        backgroundColor:
          theme.palette.type === "light"
            ? lighten(theme.palette.primary.main, 0.75)
            : darken(theme.palette.primary.main, 0.35),
      },
    },
    tableCell: {
      flex: 1,
      padding: 2,
      borderBottom: "none",
    },
    firstCellElement: {
      paddingLeft: 10,
    },
    lastCellElement: {
      paddingRight: 10,
    },
    headerRow: {
      backgroundColor: theme.palette.background.default,
    },
    noClick: {
      cursor: "initial",
    },
  }),
)

const useToolbarStyles = makeStyles((theme: Theme) => ({
  root: {
    paddingLeft: theme.spacing(2),
    paddingRight: theme.spacing(1),
    userSelect: "none",
  },
  highlight: {
    color: theme.palette.text.primary,
    backgroundColor:
      theme.palette.type === "light"
        ? lighten(theme.palette.primary.main, 0.85)
        : darken(theme.palette.primary.main, 0.45),
  },
  title: {
    flex: "1 1 100%",
  },
}))

interface IAction {
  icon: typeof React.Component
  tooltip: string
  onClick: (
    e: React.MouseEvent<HTMLButtonElement, MouseEvent>,
    data: any,
  ) => void
}

interface ITooltipProps {
  data: Array<any>
  actions: Array<(data: any[]) => JSX.Element | IAction>
  numSelected: number
  isAdd?: () => void | undefined
  exportFile?: boolean
  exportFileName?: string
  title: string | HTMLElement | Element | JSX.Element | undefined
  columns: any
  rows: any
  checkedItems?: Array<number>
  check?: Check
  setCheckedItems?: (checkedItems: Array<number>) => void
  allRecord: number
}

const EnhancedTableToolbar = (props: ITooltipProps) => {
  const classes = useToolbarStyles()
  const [anchorEl, setAnchorEl] = React.useState<HTMLButtonElement | null>(null)
  const open = Boolean(anchorEl)

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }
  const {
    numSelected,
    columns,
    rows,
    exportFileName,
    checkedItems,
    check,
  } = props

  const pdf = new jsPDF("portrait", "pt", "A4").setFontSize(12) as any
  const showCheckIcon = checkedItems ? checkedItems.length === 0 : true
  return (
    <Toolbar
      className={clsx(classes.root, {
        [classes.highlight]: numSelected > 0,
      })}
    >
      <div
        style={{
          width: "100%",
          display: "grid",
          gridTemplateColumns: "max-content 1fr",
          marginRight: 10,
        }}
      >
        <div>
          {numSelected > 0 ? (
            <Typography
              className={classes.title}
              color="inherit"
              variant="subtitle1"
              component="div"
            >
              Wybrano {numSelected}{" "}
              {numSelected > 10 && numSelected < 15
                ? "rekordów"
                : numSelected % 10 === 1
                ? "rekord"
                : numSelected % 10 > 1 && numSelected % 10 < 5
                ? "rekordy"
                : "rekordów"}
            </Typography>
          ) : (
            <span>
              <Typography
                className={classes.title}
                variant="h6"
                id="tableTitle"
                component="div"
              >
                {props.title}
              </Typography>
              {props.allRecord > 0 && (
                <Typography variant="subtitle2" color="textSecondary">
                  Iliosc rekordow: {props.allRecord}
                </Typography>
              )}
            </span>
          )}
        </div>
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
          }}
        >
          {props.actions &&
            props.actions.map((action) => {
              if (typeof action === "function") {
                return action(props.data)
              } else {
                const { icon: Icon, tooltip, onClick }: IAction = action
                return (
                  <Tooltip key={String(tooltip)} title={tooltip}>
                    <IconButton onClick={(e) => onClick(e, props.data)}>
                      <Icon />
                    </IconButton>
                  </Tooltip>
                )
              }
            })}
          {check && checkedItems!?.length > 0 && (
            <Tooltip title={check.tooltip}>
              <IconButton
                onClick={(e) => {
                  if (window.confirm("Napewno?")) {
                    check.onClick(checkedItems!)
                    props.setCheckedItems!([])
                  }
                }}
              >
                <check.icon />
              </IconButton>
            </Tooltip>
          )}
          {props.exportFile && showCheckIcon && (
            <div>
              <IconButton onClick={handleClick}>
                <SaveAltIcon />
              </IconButton>
              <Popover
                anchorEl={anchorEl}
                open={open}
                onClose={handleClose}
                anchorOrigin={{
                  vertical: "top",
                  horizontal: "center",
                }}
                transformOrigin={{
                  vertical: "top",
                  horizontal: "center",
                }}
              >
                <MenuItem
                  onClick={() => {
                    new CsvBuilder(
                      exportFileName ? `${exportFileName}.csv` : "WIP_CSV.csv",
                    )
                      .setDelimeter(";")
                      .setColumns(columns)
                      .addRows(rows)
                      .exportFile()
                    handleClose()
                  }}
                >
                  Export to CSV
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    pdf
                      .autoTable(columns, rows)
                      .save(
                        exportFileName
                          ? `${exportFileName}.pdf`
                          : "WIP_PDF.pdf",
                      )
                    handleClose()
                  }}
                >
                  Export to PDF
                </MenuItem>
              </Popover>
            </div>
          )}
          {props.isAdd && (
            <Tooltip title="Dodaj">
              <IconButton onClick={props.isAdd}>
                <AddIcon />
              </IconButton>
            </Tooltip>
          )}
        </div>
      </div>
    </Toolbar>
  )
}

interface ColumnData {
  dataKey: string
  label: string
  checked?: boolean
  columnData?: any
  disableSort?: boolean
  initialColumnValue?: any
  cellDataGetter?: TableCellDataGetter
  editComponent?: (props: any) => JSX.Element
  isFilterable?: boolean
  width?: number
  numeric?: boolean
  filterDataCell?: (row: any) => string | number
}

interface Row {
  index: number
}

interface ClickData {
  event: SyntheticEvent
  index: number
  rowData: any
}

interface Check {
  icon: () => JSX.Element
  onClick: (checkedItems: Array<number>) => void
  tooltip: string
}

interface MuiVirtualizedTableProps<T> {
  columns: ColumnData[]
  data: T[]
  headerHeight?: number
  onRowClick?: (data: ClickData) => void
  rowCount?: number
  rowGetter?: (row: Row) => void
  rowHeight?: number
  title?: string
  check?: Check
  edit?: (data: T) => void
  add?: (data: T) => void
  remove?: (data: T) => void
  actions?: Array<(data: any[]) => JSX.Element | IAction>
  isPagination?: boolean
  detailPanel?: (data: any) => ReactNode
  exportFile?: boolean
  exportFileName?: string
}

function MuiVirtualizedTable<T extends unknown>(
  props: MuiVirtualizedTableProps<T>,
) {
  const classes = useStyles()
  const {
    columns,
    rowHeight,
    headerHeight,
    data,
    check,
    edit,
    remove,
    add,
    onRowClick,
    isPagination,
    detailPanel,
    title,
    exportFile,
    exportFileName,
  } = props
  const tableRef: LegacyRef<VTable> | undefined = useRef<any>()
  const newEditElement = props.columns.reduce((acc, val) => {
    acc[val.dataKey] =
      undefined !== val.initialColumnValue
        ? val.initialColumnValue
        : val.numeric
        ? 0
        : ""
    return acc
  }, {} as any)
  const [checkedItems, setCheckedItems] = useState<any[]>([])
  const [rowIndex, setRowIndex] = useState<number | boolean>(false)
  const [addElement, setAddElement] = useState<boolean>(false)
  const [editRow, setEditRow] = useState<any>({
    id: "editRow",
    ...newEditElement,
  })
  const [detailRows, setDetailRows] = useState<Array<number>>([])
  const [filters, setFilters] = useState<Array<string>>(() =>
    columns.map((_) => ""),
  )
  const [sortOption, setSortOption] = useState<{
    sortDirection: undefined | SortDirectionType
    sortBy: undefined | string
  }>({ sortDirection: undefined, sortBy: undefined })

  // const rowCache = useMemo(
  //   () =>
  //     new CellMeasurerCache({
  //       fixedWidth: true,
  //       defaultHeight: 50,
  //       minHeight: 50,
  //     }),
  //   [editRow],
  // )

  const rowCache = new CellMeasurerCache({
    fixedWidth: true,
    defaultHeight: 50,
    minHeight: 50,
  })

  let rowParent: any = null // let a cellRenderer supply a usable value

  let tableData = filterData(
    data,
    filters,
    columns.map((_) => ({ key: _.dataKey, getter: _.filterDataCell })),
  )

  if (addElement) tableData = [editRow, ...tableData]

  tableData = orderBy(
    tableData,
    [sortOption.sortBy],
    [
      undefined !== sortOption.sortDirection &&
        (sortOption.sortDirection.toLowerCase() as any),
    ],
  )

  // const [tableContentHeight, setTableContentHeight] = useState<number>(
  //   rowHeight ? tableData.length * rowHeight : tableData.length * 50,
  // )

  // useEffect(() => {
  //   setEditRow(newEditElement)
  // }, [])

  // useEffect(() => {
  //   let _height = 0

  //   for (let index = 0; index < tableData.length; index++) {
  //     _height = _height + (rowCache as any)._rowHeightCache[`${index}-0`]
  //   }
  //   console.log(_height)
  //   !isNaN(_height) && setTableContentHeight(_height)
  // }, [tableData.length, rowCache])

  const isFilterable = columns.some((el: any) => el.isFilterable)

  const cellRenderer = (
    params: TableCellProps & {
      editComponent?: (props: any) => JSX.Element
      numeric?: boolean
      filterDataCell?: (row: T) => string | number | boolean
    },
  ) => {
    const {
      cellData,
      columnIndex,
      dataKey,
      rowData,
      editComponent,
      parent,
      rowIndex,
      numeric,
    } = params
    const { columns, rowHeight, onRowClick, check, detailPanel } = props
    rowParent = parent

    return (
      <CellMeasurer
        cache={rowCache}
        columnIndex={columnIndex}
        parent={parent}
        rowIndex={rowIndex}
      >
        {(measurerParams) => {
          return (
            <TableCell
              ref={measurerParams.registerChild}
              onLoad={measurerParams.measure}
              component="div"
              {...(dataKey === "check" && {
                onClick: (e) => e.stopPropagation(),
              })}
              {...(dataKey === "edit" && {
                onClick: (e) => e.stopPropagation(),
              })}
              {...(dataKey === "remove" && {
                onClick: (e) => e.stopPropagation(),
              })}
              {...(dataKey === "detail" && {
                onClick: (e) => e.stopPropagation(),
              })}
              {...(rowData.id === editRow.id && {
                onClick: (e) => e.stopPropagation(),
              })}
              className={clsx(classes.tableCell, classes.flexContainer, {
                [classes.noClick]: onRowClick == null,
                [classes.firstCellElement]:
                  columnIndex === (check ? (detailPanel ? 2 : 1) : 0),
                [classes.lastCellElement]:
                  columnIndex === columns.length - (check ? 0 : 1),
              })}
              variant="body"
              style={{
                height: rowHeight
                  ? rowHeight
                  : rowCache.getHeight(rowIndex, columnIndex),
                ...(dataKey === "check" && { justifyContent: "center" }),
              }}
              align={
                columnIndex !== (check ? (detailPanel ? 2 : 1) : 0)
                  ? "right"
                  : "left"
              }
            >
              {editRow.id === rowData.id &&
              dataKey !== "check" &&
              dataKey !== "edit" &&
              dataKey !== "remove" &&
              editRow.tableMode !== "REMOVE" ? (
                editComponent ? (
                  editComponent({
                    value: editRow[dataKey],
                    setNewValue: (data: any, key?: string) =>
                      setEditRow((prev: any) => ({
                        ...prev,
                        [key ? key : dataKey]: data,
                      })),
                    data: rowData,
                  })
                ) : (
                  <TextField
                    fullWidth
                    type={numeric ? "number" : "text"}
                    value={editRow[dataKey]}
                    onChange={(e) =>
                      setEditRow((prev: any) => ({
                        ...prev,
                        [dataKey]: numeric
                          ? Number(e.target.value)
                          : e.target.value,
                      }))
                    }
                  />
                )
              ) : detailPanel && dataKey === "detail" ? (
                <IconButton
                  disableRipple
                  onClick={() => {
                    if (detailRows.includes(rowIndex)) {
                      rowCache.set(
                        rowIndex,
                        0,
                        rowCache.getWidth(rowIndex, 0),
                        50,
                      )
                      null !== tableRef.current &&
                        tableRef.current &&
                        tableRef.current.recomputeRowHeights(rowIndex)
                      //null !== tableRef.current && tableRef.current && tableRef.current.forceUpdate()
                      setDetailRows((prev) =>
                        prev.filter((el) => el !== rowIndex),
                      )
                    } else {
                      rowCache.set(
                        rowIndex,
                        0,
                        rowCache.getWidth(rowIndex, 0),
                        300,
                      )
                      null !== tableRef.current &&
                        tableRef.current &&
                        tableRef.current.recomputeRowHeights(rowIndex)
                      setDetailRows((prev) => prev.concat(rowIndex))
                    }
                  }}
                >
                  <ChevronRightIcon
                    style={{
                      transform: detailRows.includes(rowIndex)
                        ? "rotate(90deg)"
                        : "rotate(0deg)",
                    }}
                  />
                </IconButton>
              ) : (
                cellData
              )}
            </TableCell>
          )
        }}
      </CellMeasurer>
    )
  }

  const rowRenderer = (params: TableRowProps) => {
    const { detailPanel } = props
    const { onRowClick, rowData, index, className } = params

    return (
      <CellMeasurer
        cache={rowCache}
        columnIndex={0}
        key={params.key}
        parent={rowParent as any}
        rowIndex={params.index}
      >
        <>
          <TableRow
            onClick={(event: React.MouseEvent<HTMLTableRowElement>) => {
              if (params.onRowClick) {
                setRowIndex(
                  rowIndex && rowIndex === params.index ? false : params.index,
                )
                return params.onRowClick({ rowData, index, event })
              }
            }}
            className={clsx(
              className,
              classes.tableRow,
              classes.flexContainer,
              {
                [classes.tableRowHover]: index !== -1 && onRowClick != null,
                [classes.tableRowSelected]: index === rowIndex,
              },
            )}
            component="div"
            key={params.key}
            style={{
              ...params.style,
              height: "max-content",
              borderBottom: "1px solid rgba(224, 224, 224, 1)",
            }}
          >
            {params.columns}
          </TableRow>
          {detailPanel && detailRows.includes(index) && (
            <TableRow
              component="div"
              style={{
                ...params.style,
                borderBottom: "1px solid rgba(224, 224, 224, 1)",
                height: "max-content",
              }}
            >
              {detailPanel(rowData)}
            </TableRow>
          )}
        </>
      </CellMeasurer>
    )
  }

  const headerRowRenderer = (params: TableHeaderRowProps) => {
    const { columns, headerHeight } = props
    const handleChange = debounce(
      (value, index) =>
        setFilters((prev) => prev.map((_, i) => (i === index ? value : _))),
      500,
    )
    const actionColumn: ColumnData = { dataKey: "", label: "" }
    let allColumns = [...columns]
    if (props.check) allColumns = [actionColumn, ...allColumns]
    if (props.add) allColumns = [...allColumns, actionColumn]
    if (props.edit) allColumns = [...allColumns, actionColumn]

    return (
      <>
        {isFilterable && (
          <TableRow
            className={clsx(params.className, classes.headerRow)}
            style={{ ...params.style, display: "flex", height: 50 }}
            component="div"
          >
            {params.columns.map((_: any, i) => {
              const index =
                props.check && props.detailPanel
                  ? i - 2
                  : props.detailPanel
                  ? i - 1
                  : props.check
                  ? i - 1
                  : i

              return (
                <TableCell
                  key={i}
                  component="div"
                  onClick={(e) => e.stopPropagation()}
                  className={clsx(
                    classes.tableCell,
                    classes.flexContainer,
                    classes.noClick,
                    {
                      [classes.firstCellElement]: index === 0,
                      [classes.lastCellElement]: i === allColumns.length - 1,
                    },
                  )}
                  variant="head"
                  style={{
                    ..._.props.style,
                    height: 50,
                    borderBottom: "none",
                    padding: "0px 5px",
                  }}
                  align={
                    allColumns[index]
                      ? index !== 0
                        ? "right"
                        : "left"
                      : "center"
                  }
                >
                  {columns[index] && columns[index].isFilterable && (
                    <TextField
                      style={{ padding: 0 }}
                      defaultValue={filters[i]}
                      onChange={(e) => handleChange(e.target.value, index)}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <FilterListIcon fontSize="small" />
                          </InputAdornment>
                        ),
                      }}
                      fullWidth
                    />
                  )}
                </TableCell>
              )
            })}
          </TableRow>
        )}
        <TableRow
          className={clsx(params.className, classes.headerRow)}
          style={{
            ...params.style,
            width: "auto",
            display: "flex",
            height: headerHeight ? headerHeight : 50,
          }}
          component="div"
        >
          {params.columns}
        </TableRow>
      </>
    )
  }

  const headerRenderer = (
    params: TableHeaderProps & { columnIndex: number },
  ) => {
    const { label, columnIndex, dataKey } = params
    const { columns, headerHeight } = props

    return (
      <TableCell
        component="div"
        className={clsx(
          classes.tableCell,
          classes.flexContainer,
          classes.noClick,
          {
            [classes.firstCellElement]: columnIndex === 0,
            [classes.lastCellElement]: columnIndex === columns.length - 1,
          },
        )}
        variant="head"
        style={{ height: headerHeight ? headerHeight : 50 }}
      >
        <div
          style={{
            width: "100%",
            display: "flex",
            justifyContent: dataKey === "check" ? "center" : "space-between",
            flexDirection: columnIndex === 0 ? "row-reverse" : "row",
          }}
        >
          {columns[columnIndex] && sortOption.sortBy === params.dataKey ? (
            <ArrowDownwardIcon
              style={{
                transform:
                  sortOption.sortDirection === "DESC"
                    ? "rotate(180deg)"
                    : "rotate(0deg)",
                transition: "transform 0.2s ease-in-out",
              }}
              fontSize="small"
            />
          ) : columns[columnIndex] ? (
            <div style={{ width: 20, height: 20 }} />
          ) : null}
          {dataKey === "check" ? (
            <Checkbox
              disableRipple
              color="default"
              indeterminate={
                checkedItems.length > 0 &&
                tableData.length > checkedItems.length
              }
              checked={tableData.length === checkedItems.length}
              onChange={() =>
                tableData.length === checkedItems.length
                  ? setCheckedItems([])
                  : setCheckedItems(tableData.map((el: any) => el.id))
              }
            />
          ) : (
            <span style={{ userSelect: "none" }}>{label}</span>
          )}
        </div>
      </TableCell>
    )
  }

  const customHeaderHeight = headerHeight
    ? isFilterable
      ? headerHeight + 50
      : headerHeight
    : isFilterable
    ? 96
    : 50

  const isCheck = Boolean(check)
  const isEdit = Boolean(edit)
  const isAdd = Boolean(add)
  const isRemove = Boolean(remove)
  const isDetail = Boolean(detailPanel)

  const showActions = isEdit || isAdd || isRemove

  return (
    <AutoSizer style={{ height: "max-content" }}>
      {({ height, width }) => {
        let _height = 0
        tableData.forEach((e: T, i: number) => {
          const el = (rowCache as any)._rowHeightCache[`${i}-0`]
          _height = el ? _height + el : 0
        })
        _height =
          _height === 0
            ? rowHeight
              ? tableData.length * rowHeight
              : tableData.length * 50
            : _height
        let tableHeight =
          _height > height ? height : _height + customHeaderHeight
        const newTableHeight = tableHeight + detailRows.length * 300
        if (detailRows)
          tableHeight = newTableHeight > height ? height : newTableHeight

        return (
          <Paper
            style={{
              width,
              height: tableHeight + 64 + (isPagination ? 52 : 0),
            }}
          >
            <EnhancedTableToolbar
              data={data}
              {...(isAdd && {
                isAdd: () => {
                  setEditRow({
                    id: "editRow",
                    ...newEditElement,
                    tableMode: "ADD",
                  })
                  setAddElement((prev) => !prev)
                },
              })}
              {...(isCheck && { checkedItems, check, setCheckedItems })}
              allRecord={tableData.length}
              actions={props.actions!}
              title={title}
              numSelected={checkedItems.length}
              exportFile={exportFile}
              exportFileName={exportFileName}
              columns={columns.map((el) => el.dataKey)}
              rows={data.map((el: any) =>
                Object.keys(el)
                  .filter((item) => item !== "id")
                  .map((element: any) => el[element]),
              )}
            />
            <VTable
              ref={tableRef}
              height={tableHeight}
              width={width}
              rowHeight={rowCache.rowHeight}
              gridStyle={{
                direction: "inherit",
              }}
              {...(editRow.tableMode === "ADD" && { scrollToIndex: 0 })}
              sort={(info) => {
                setSortOption((prev) => {
                  if (!prev.sortDirection && !prev.sortBy) {
                    return { sortDirection: "ASC", sortBy: info.sortBy }
                  }
                  if (
                    prev.sortDirection === "ASC" &&
                    prev.sortBy &&
                    prev.sortBy === info.sortBy
                  ) {
                    return { sortDirection: "DESC", sortBy: info.sortBy }
                  }
                  if (
                    prev.sortDirection === "ASC" &&
                    prev.sortBy &&
                    prev.sortBy !== info.sortBy
                  ) {
                    return { sortDirection: "ASC", sortBy: info.sortBy }
                  }
                  if (
                    prev.sortDirection &&
                    prev.sortDirection !== info.sortDirection &&
                    prev.sortBy &&
                    prev.sortBy !== info.sortBy
                  ) {
                    return {
                      sortDirection: info.sortDirection,
                      sortBy: info.sortBy,
                    }
                  }
                  if (
                    prev.sortDirection === "DESC" &&
                    prev.sortBy &&
                    prev.sortBy !== info.sortBy
                  ) {
                    return { sortDirection: "DESC", sortBy: info.sortBy }
                  }
                  return { sortDirection: undefined, sortBy: undefined }
                })
              }}
              rowCount={tableData.length}
              rowGetter={({ index }) => tableData[index]}
              headerHeight={customHeaderHeight}
              className={classes.table}
              rowRenderer={rowRenderer}
              onRowClick={onRowClick}
              headerRowRenderer={headerRowRenderer}
              sortDirection={sortOption.sortDirection}
              deferredMeasurementCache={rowCache}
            >
              {isDetail && (
                <Column
                  dataKey="detail"
                  width={60}
                  headerRenderer={(headerProps) =>
                    headerRenderer({
                      ...headerProps,
                      columnIndex: -2,
                    })
                  }
                  className={classes.flexContainer}
                  disableSort
                  cellRenderer={cellRenderer}
                />
              )}
              {isCheck && (
                <Column
                  dataKey="check"
                  cellDataGetter={(params) => {
                    const checked = checkedItems.includes(params.rowData.id)

                    return (
                      params.rowData.id !== "editRow" && (
                        <Checkbox
                          disableRipple
                          color="default"
                          checked={checked}
                          onChange={() =>
                            checked
                              ? setCheckedItems((prev) =>
                                  prev.filter((el) => el !== params.rowData.id),
                                )
                              : setCheckedItems((prev) =>
                                  prev.concat(params.rowData.id),
                                )
                          }
                        />
                      )
                    )
                  }}
                  width={60}
                  headerRenderer={(headerProps) =>
                    headerRenderer({
                      ...headerProps,
                      columnIndex: -1,
                    })
                  }
                  className={classes.flexContainer}
                  disableSort
                  cellRenderer={cellRenderer}
                />
              )}
              {columns.map(
                (
                  { dataKey, editComponent, numeric, filterDataCell, ...other },
                  index,
                  arr,
                ) => {
                  return (
                    <Column
                      key={dataKey}
                      headerRenderer={(headerProps) =>
                        headerRenderer({
                          ...headerProps,
                          columnIndex: index,
                        })
                      }
                      className={classes.flexContainer}
                      cellRenderer={(cellProps) =>
                        cellRenderer({
                          ...cellProps,
                          editComponent,
                          numeric,
                          filterDataCell,
                        })
                      }
                      dataKey={dataKey}
                      width={width / arr.length}
                      {...other}
                    />
                  )
                },
              )}
              {showActions && (
                <Column
                  dataKey="edit"
                  width={60}
                  headerRenderer={(headerProps) =>
                    headerRenderer({
                      ...headerProps,
                      columnIndex: columns.length,
                    })
                  }
                  cellDataGetter={(params) =>
                    params.rowData.id === editRow.id ? (
                      <IconButton
                        disableRipple
                        onClick={() => {
                          addElement && setAddElement(false)
                          if (isAdd && editRow.tableMode === "ADD") {
                            delete editRow.id
                            delete editRow.tableMode
                            add!(editRow)
                          }
                          if (isEdit && editRow.tableMode === "EDIT") {
                            delete editRow.tableMode
                            edit!(editRow)
                          }
                          if (isRemove && editRow.tableMode === "REMOVE") {
                            delete editRow.tableMode
                            remove!(editRow)
                          }
                          setEditRow({
                            id: "editRow",
                            ...newEditElement,
                            tableMode: "EDIT",
                          })
                        }}
                      >
                        <CheckIcon />
                      </IconButton>
                    ) : (
                      isEdit && (
                        <IconButton
                          disableRipple
                          onClick={() => {
                            addElement && setAddElement(false)
                            setEditRow({
                              ...params.rowData,
                              tableMode: "EDIT",
                            })
                          }}
                        >
                          <EditIcon />
                        </IconButton>
                      )
                    )
                  }
                  className={classes.flexContainer}
                  disableSort
                  cellRenderer={cellRenderer}
                />
              )}
              {showActions && (
                <Column
                  dataKey="remove"
                  width={60}
                  headerRenderer={(headerProps) =>
                    headerRenderer({
                      ...headerProps,
                      columnIndex: columns.length + 1,
                    })
                  }
                  cellDataGetter={(params) =>
                    params.rowData.id === editRow.id ? (
                      <IconButton
                        disableRipple
                        onClick={() => {
                          setEditRow({
                            id: "editRow",
                            ...newEditElement,
                            tableMode: "REMOVE",
                          })
                          setAddElement(false)
                        }}
                      >
                        <ClearIcon />
                      </IconButton>
                    ) : (
                      isRemove && (
                        <IconButton
                          disableRipple
                          onClick={() => {
                            addElement && setAddElement(false)
                            setEditRow({
                              ...params.rowData,
                              tableMode: "REMOVE",
                            })
                          }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      )
                    )
                  }
                  className={classes.flexContainer}
                  disableSort
                  cellRenderer={cellRenderer}
                />
              )}
            </VTable>
            {isPagination && (
              <TablePagination
                onPageChange={() => {}}
                component="div"
                count={100}
                page={1}
                onChangePage={() => {}}
                rowsPerPage={10}
                onChangeRowsPerPage={() => {}}
                rowsPerPageOptions={[10, 50, { value: -1, label: "All" }]}
              />
            )}
          </Paper>
        )
      }}
    </AutoSizer>
  )
}

const typedMemo: <T>(c: T) => T = memo
export default typedMemo(MuiVirtualizedTable)
