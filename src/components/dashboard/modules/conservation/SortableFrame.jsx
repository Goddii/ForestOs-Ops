/**
 * Wraps a sortable `DataTable`. The kit's column-header buttons are text-sized;
 * this gives them a 44 px hit area for tablets without editing the kit.
 */
export default function SortableFrame({ children, className = '' }) {
  return <div className={'[&_th>button]:inline-flex [&_th>button]:min-h-11 [&_th>button]:items-center ' + className}>{children}</div>
}
