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
        boxSizing: "border-box",
        alignItems: "center",
        display: "flex",
        padding: "0px 5px",
      },
      "& .ReactVirtualized__Table__rowColumn": {
        marginRight: 0,
        marginLeft: 0,
        boxSizing: "border-box",
      },
      "& .ReactVirtualized__Table__headerColumn": {
        marginRight: 0,
        marginLeft: 0,
      },
      "& .ReactVirtualized__Table__row": {
        boxSizing: "border-box",
        padding: "0px 5px",
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
          : darken(theme.palette.primary.main, 0.4),
      "&:hover": {
        backgroundColor:
          theme.palette.type === "light"
            ? lighten(theme.palette.primary.main, 0.75)
            : darken(theme.palette.primary.main, 0.35),
      },
    },
    tableCell: {
      flex: 1,
      padding: "0px 5px",
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
        : darken(theme.palette.primary.main, 0.4),
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
                    <IconButton
                      size="small"
                      onClick={(e) => onClick(e, props.data)}
                    >
                      <Icon />
                    </IconButton>
                  </Tooltip>
                )
              }
            })}
          {check && checkedItems!?.length > 0 && (
            <Tooltip title={check.tooltip}>
              <IconButton
                size="small"
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
              <IconButton size="small" onClick={handleClick}>
                <SaveAltIcon fontSize="small" />
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
              <IconButton size="small" onClick={props.isAdd}>
                <AddIcon fontSize="small" />
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
  //       defaultHeight: 44,
  //       minHeight: 44,
  //     }),
  //   [editRow],
  // )

  const rowCache = new CellMeasurerCache({
    fixedWidth: true,
    defaultHeight: 44,
    minHeight: 44,
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
  if (detailPanel) {
    tableData = tableData.map((el: T) => ({
      ...(el as any),
      detail: detailPanel(el),
    }))
  }
  // detailRows.forEach((id) => {
  //   tableData.splice(id + 1, 0, { id: `detailRow-${id}` })
  // })

  const [tableHeight, setHeight] = useState<number>(400)

  const isFilterable = columns.some((el: any) => el.isFilterable)

  const cellRenderer = (
    params: TableCellProps & {
      isActionUsage: boolean
      editComponent?: (props: any) => JSX.Element
      numeric?: boolean
      filterDataCell?: (row: T) => string | number | boolean
      colInd: number
      last: boolean
      first: boolean
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
      isActionUsage,
      colInd,
      last,
      first,
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
            <div
              ref={measurerParams.registerChild as any}
              onLoad={measurerParams.measure}
              {...(!isActionUsage ||
                (rowData.id === editRow.id && {
                  onClick: (e) => e.stopPropagation(),
                }))}
              className={clsx(classes.tableCell, classes.flexContainer, {
                [classes.noClick]: onRowClick == null,
                [classes.firstCellElement]: first,
                [classes.lastCellElement]: last,
              })}
              style={{
                whiteSpace: "normal",
                height: rowHeight
                  ? rowHeight
                  : rowCache.getHeight(rowIndex, columnIndex),
                ...(isActionUsage && { justifyContent: "center" }),
              }}
            >
              {editRow.id === rowData.id && editRow.tableMode !== "REMOVE" ? (
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
                ) : isActionUsage ? (
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
                ) : colInd === columnIndex ? (
                  cellData
                ) : null
              ) : detailPanel && dataKey === "detail" ? (
                <IconButton
                  size="small"
                  disableRipple
                  onClick={() => {
                    if (detailRows.includes(rowData.id)) {
                      tableRef.current?.recomputeRowHeights()
                      tableRef.current?.forceUpdateGrid()
                      tableRef.current?.forceUpdate()
                      setDetailRows((prev) =>
                        prev.filter((el) => el !== rowData.id),
                      )
                    } else {
                      tableRef.current?.recomputeRowHeights()
                      tableRef.current?.forceUpdateGrid()
                      tableRef.current?.forceUpdate()
                      tableRef.current?.recomputeRowHeights()
                      setDetailRows((prev) => prev.concat(rowData.id))
                    }
                  }}
                >
                  <ChevronRightIcon
                    fontSize="small"
                    style={{
                      transform: detailRows.includes(rowData.id)
                        ? "rotate(90deg)"
                        : "rotate(0deg)",
                    }}
                  />
                </IconButton>
              ) : (
                cellData
              )}
            </div>
          )
        }}
      </CellMeasurer>
    )
  }

  const rowRenderer = (params: TableRowProps) => {
    const { detailPanel } = props
    const { onRowClick, rowData, index, className } = params
    console.log(detailRows.includes(rowData.id), detailRows)
    return (
      <CellMeasurer
        cache={rowCache}
        columnIndex={0}
        key={params.key}
        parent={rowParent as any}
        rowIndex={params.index}
      >
        <>
          <div
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
            key={params.key}
            style={{
              ...params.style,
              borderBottom: "1px solid rgba(224, 224, 224, 1)",
            }}
          >
            {params.columns}
          </div>
          <div
            style={{
              ...params.style,
              top: params.style.top + 45,
              display: detailRows.includes(rowData.id)
                ? "inline-block"
                : "none",
              borderBottom: "1px solid rgba(224, 224, 224, 1)",
              height: "max-content",
            }}
          >
            {rowData.detail}
          </div>
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
            style={{ ...params.style, display: "flex", height: 44 }}
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
                    height: 44,
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
            height: headerHeight ? headerHeight : 44,
          }}
          component="div"
        >
          {params.columns}
        </TableRow>
      </>
    )
  }

  const headerRenderer = (
    params: TableHeaderProps & {
      columnIndex: number
      first?: boolean
      last?: boolean
    },
  ) => {
    const { label, columnIndex, dataKey, first, last } = params
    const { columns, headerHeight } = props

    return (
      <div
        className={clsx(
          classes.tableCell,
          classes.flexContainer,
          classes.noClick,
          {
            [classes.firstCellElement]: first,
            [classes.lastCellElement]: last,
          },
        )}
        style={{
          height: headerHeight ? headerHeight : 44,
          ...(dataKey === "check" && { justifyContent: "center" }),
        }}
      >
        <div
          style={{
            width: "100%",
            display: "flex",
            justifyContent: "space-between",
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
              size="small"
              disableRipple
              style={{ padding: 0 }}
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
      </div>
    )
  }

  const customHeaderHeight = headerHeight
    ? isFilterable
      ? headerHeight + 44
      : headerHeight
    : isFilterable
    ? 96
    : 44

  const isCheck = Boolean(check)
  const isEdit = Boolean(edit)
  const isAdd = Boolean(add)
  const isRemove = Boolean(remove)
  const isDetail = Boolean(detailPanel)

  const showActions = isEdit || isAdd || isRemove

  return (
    <AutoSizer>
      {({ height, width }) => {
        return height > 0 ? (
          <TableComponent
            {...{
              tableHeight,
              width,
              isPagination,
              isAdd,
              data,
              setEditRow,
              newEditElement,
              setAddElement,
              isCheck,
              tableData,
              checkedItems,
              check,
              setCheckedItems,
              title,
              exportFile,
              exportFileName,
              columns,
              tableRef,
              rowCache,
              editRow,
              classes,
              setSortOption,
              customHeaderHeight,
              rowRenderer,
              onRowClick,
              headerRowRenderer,
              sortOption,
              isDetail,
              headerRenderer,
              cellRenderer,
              showActions,
              addElement,
              isEdit,
              add,
              edit,
              remove,
              isRemove,
              setHeight,
              height,
            }}
          />
        ) : (
          <span>Height = 0</span>
        )
      }}
    </AutoSizer>
  )
}

const TableComponent = memo((props: any) => {
  const {
    tableHeight,
    width,
    isPagination,
    isAdd,
    data,
    setEditRow,
    newEditElement,
    setAddElement,
    isCheck,
    tableData,
    checkedItems,
    check,
    setCheckedItems,
    title,
    exportFile,
    exportFileName,
    columns,
    tableRef,
    rowCache,
    editRow,
    classes,
    setSortOption,
    customHeaderHeight,
    rowRenderer,
    onRowClick,
    headerRowRenderer,
    sortOption,
    isDetail,
    headerRenderer,
    cellRenderer,
    showActions,
    addElement,
    isEdit,
    add,
    edit,
    remove,
    isRemove,
    setHeight,
    height,
  } = props

  useEffect(() => {
    setTimeout(() => {
      const _height =
        (Object.values(
          (rowCache as any)["_rowHeightCache"],
        ) as number[]).reduce((sum, el) => sum + el, 0) + customHeaderHeight
      setHeight(_height > height ? height : _height)
    }, 0)
  }, [])

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
            setAddElement((prev: any) => !prev)
          },
        })}
        {...(isCheck && { checkedItems, check, setCheckedItems })}
        allRecord={tableData.length}
        actions={props.actions!}
        title={title}
        numSelected={checkedItems.length}
        exportFile={exportFile}
        exportFileName={exportFileName}
        columns={columns.map((el: any) => el.dataKey)}
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
          setSortOption((prev: any) => {
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
            width={38}
            headerRenderer={(headerProps) =>
              headerRenderer({
                ...headerProps,
                columnIndex: -2,
              })
            }
            className={classes.flexContainer}
            disableSort
            cellRenderer={(cellProps) =>
              cellRenderer({
                ...cellProps,
                isActionUsage: false,
                colInd: "detail",
              })
            }
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
                    size="small"
                    style={{ padding: 0 }}
                    disableRipple
                    color="default"
                    checked={checked}
                    onChange={() =>
                      checked
                        ? setCheckedItems((prev: any) =>
                            prev.filter((el: any) => el !== params.rowData.id),
                          )
                        : setCheckedItems((prev: any) =>
                            prev.concat(params.rowData.id),
                          )
                    }
                  />
                )
              )
            }}
            width={42}
            headerRenderer={(headerProps) =>
              headerRenderer({
                ...headerProps,
                columnIndex: -1,
              })
            }
            className={classes.flexContainer}
            disableSort
            cellRenderer={(cellProps) =>
              cellRenderer({
                ...cellProps,
                isActionUsage: false,
                colInd: "check",
              })
            }
          />
        )}
        {columns.map(
          (
            { dataKey, editComponent, numeric, filterDataCell, ...other }: any,
            index: number,
            arr: any[],
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
                    isActionUsage: true,
                    colInd: isDetail
                      ? isCheck
                        ? index + 2
                        : index + 1
                      : index,
                    first: isDetail || isCheck ? false : index === 0,
                    last: isEdit || isAdd ? false : arr.length - 1 === index,
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
            width={35}
            headerRenderer={(headerProps) =>
              headerRenderer({
                ...headerProps,
                columnIndex: columns.length,
              })
            }
            cellDataGetter={(params) =>
              params.rowData.id === editRow.id ? (
                <IconButton
                  size="small"
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
                  <CheckIcon fontSize="small" />
                </IconButton>
              ) : (
                isEdit && (
                  <IconButton
                    size="small"
                    disableRipple
                    onClick={() => {
                      addElement && setAddElement(false)
                      setEditRow({
                        ...params.rowData,
                        tableMode: "EDIT",
                      })
                    }}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                )
              )
            }
            className={classes.flexContainer}
            disableSort
            cellRenderer={(cellProps) =>
              cellRenderer({
                ...cellProps,
                isActionUsage: false,
                colInd: isDetail
                  ? isCheck
                    ? columns.length + 2
                    : columns.length + 1
                  : columns.length,
              })
            }
          />
        )}
        {showActions && (
          <Column
            dataKey="remove"
            width={40}
            headerRenderer={(headerProps) =>
              headerRenderer({
                ...headerProps,
                columnIndex: columns.length + 1,
              })
            }
            cellDataGetter={(params) =>
              params.rowData.id === editRow.id ? (
                <IconButton
                  size="small"
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
                  <ClearIcon fontSize="small" />
                </IconButton>
              ) : (
                isRemove && (
                  <IconButton
                    size="small"
                    disableRipple
                    onClick={() => {
                      addElement && setAddElement(false)
                      setEditRow({
                        ...params.rowData,
                        tableMode: "REMOVE",
                      })
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                )
              )
            }
            className={classes.flexContainer}
            disableSort
            cellRenderer={(cellProps) =>
              cellRenderer({
                ...cellProps,
                isActionUsage: false,
                colInd: isDetail
                  ? isCheck
                    ? columns.length + 3
                    : columns.length + 2
                  : columns.length,
              })
            }
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
})

const typedMemo: <T>(c: T) => T = memo
export default typedMemo(MuiVirtualizedTable)
