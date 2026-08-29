import * as stylex from "@stylexjs/stylex";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@interviews-tool/web-ui";
import { Skeleton } from "@interviews-tool/web-ui-stylex";

const styles = stylex.create({
  skeletonH4W20: { height: 16, width: 80 },
  skeletonH4W16: { height: 16, width: 64 },
  skeletonH4W24: { height: 16, width: 96 },
  skeletonH4W16ML: { height: 16, width: 64, marginLeft: "auto" },
  skeletonH4W32: { height: 16, width: 128 },
  skeletonH5W20: { height: 20, width: 80 },
  skeletonH7W7: { height: 28, width: 28 },
});

export function HiringProcessTableSkeleton() {
  return (
    <Table>
      <TableHeader>
        <TableRow className="border-b border-border">
          <TableHead className="text-left p-2 font-medium">
            <Skeleton style={styles.skeletonH4W20} />
          </TableHead>
          <TableHead className="text-left p-2 font-medium">
            <Skeleton style={styles.skeletonH4W16} />
          </TableHead>
          <TableHead className="text-left p-2 font-medium">
            <Skeleton style={styles.skeletonH4W16} />
          </TableHead>
          <TableHead className="text-left p-2 font-medium">
            <Skeleton style={styles.skeletonH4W24} />
          </TableHead>
          <TableHead className="text-right p-2 font-medium">
            <Skeleton style={styles.skeletonH4W16ML} />
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: 5 }).map((_, index) => (
          <TableRow key={index} className="border-b border-border hover:bg-muted/50">
            <TableCell className="p-2">
              <Skeleton style={styles.skeletonH4W32} />
            </TableCell>
            <TableCell className="p-2">
              <Skeleton style={styles.skeletonH5W20} />
            </TableCell>
            <TableCell className="p-2">
              <Skeleton style={styles.skeletonH4W24} />
            </TableCell>
            <TableCell className="p-2">
              <Skeleton style={styles.skeletonH4W20} />
            </TableCell>
            <TableCell className="p-2 text-right">
              <div className="flex justify-end gap-1">
                <Skeleton style={styles.skeletonH7W7} />
                <Skeleton style={styles.skeletonH7W7} />
                <Skeleton style={styles.skeletonH7W7} />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
