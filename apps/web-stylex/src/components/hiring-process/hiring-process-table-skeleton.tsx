import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Skeleton,
} from "@interviews-tool/web-ui";

export function HiringProcessTableSkeleton() {
  return (
    <Table>
      <TableHeader>
        <TableRow className="border-b border-border">
          <TableHead className="text-left p-2 font-medium">
            <Skeleton className="h-4 w-20" />
          </TableHead>
          <TableHead className="text-left p-2 font-medium">
            <Skeleton className="h-4 w-16" />
          </TableHead>
          <TableHead className="text-left p-2 font-medium">
            <Skeleton className="h-4 w-16" />
          </TableHead>
          <TableHead className="text-left p-2 font-medium">
            <Skeleton className="h-4 w-24" />
          </TableHead>
          <TableHead className="text-right p-2 font-medium">
            <Skeleton className="h-4 w-16 ml-auto" />
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: 5 }).map((_, index) => (
          <TableRow key={index} className="border-b border-border hover:bg-muted/50">
            <TableCell className="p-2">
              <Skeleton className="h-4 w-32" />
            </TableCell>
            <TableCell className="p-2">
              <Skeleton className="h-5 w-20" />
            </TableCell>
            <TableCell className="p-2">
              <Skeleton className="h-4 w-24" />
            </TableCell>
            <TableCell className="p-2">
              <Skeleton className="h-4 w-20" />
            </TableCell>
            <TableCell className="p-2 text-right">
              <div className="flex justify-end gap-1">
                <Skeleton className="h-7 w-7" />
                <Skeleton className="h-7 w-7" />
                <Skeleton className="h-7 w-7" />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
