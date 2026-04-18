import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={false}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col space-y-3",
        month: "space-y-2",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-medium",
        caption_dropdowns: "flex justify-center gap-1",
        dropdown: "px-2 py-1 text-xs rounded border bg-background focus:outline-none focus:ring-1 focus:ring-primary",
        dropdown_month: "px-2 py-1 text-xs rounded border bg-background focus:outline-none focus:ring-1 focus:ring-primary",
        dropdown_year: "px-2 py-1 text-xs rounded border bg-background focus:outline-none focus:ring-1 focus:ring-primary",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse",
        head_row: "flex justify-between",
        head_cell: "text-muted-foreground w-8 font-normal text-[0.75rem]",
        row: "flex justify-between w-full mt-1",
        cell: "h-8 w-8 text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-8 w-8 p-0 font-normal text-xs hover:bg-accent hover:text-accent-foreground"
        ),
        day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
        day_today: "bg-accent text-accent-foreground font-semibold",
        day_disabled: "text-muted-foreground opacity-30",
        ...classNames,
      }}
      components={{
        IconLeft: ({ ..._props }) => <ChevronLeft className="h-4 w-4" />,
        IconRight: ({ ..._props }) => <ChevronRight className="h-4 w-4" />,
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
