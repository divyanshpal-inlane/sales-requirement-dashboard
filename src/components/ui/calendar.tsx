import { ChevronLeftIcon, ChevronRightIcon } from "@radix-ui/react-icons";
import { cva, type VariantProps } from "class-variance-authority"; // Add this import
import * as React from "react";
import { DayPicker } from "react-day-picker";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Define variants for day_selected
const dayVariants = cva(
  "text-primary-foreground hover:text-primary-foreground focus:text-primary-foreground",
  {
    variants: {
      variant: {
        default: "bg-primary hover:bg-primary focus:bg-primary",
        purple:
          "bg-accent-purple hover:bg-accent-purple focus:bg-accent-purple",
        dot: "dot-date flex gap-1 justify-center border text-foreground border-primary hover:text-foreground",
        reschedule: "bg-yellow-500 hover:bg-yellow-600 focus:bg-yellow-600",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

// Update CalendarProps to include dayVariants
export type CalendarProps = React.ComponentProps<typeof DayPicker> &
  VariantProps<typeof dayVariants>;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  variant, // Add this line
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4 w-full",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-medium",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex w-full justify-between",
        head_cell:
          "text-muted-foreground rounded-md w-8 font-normal text-[0.8rem]",
        row: "flex w-full justify-between mt-2",
        cell: cn(
          "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-accent [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected].day-range-end)]:rounded-r-md",
          props.mode === "range"
            ? "[&:has(>.day-range-end)]:rounded-r-md [&:has(>.day-range-start)]:rounded-l-md first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md"
            : "[&:has([aria-selected])]:rounded-md",
        ),
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-8 w-8 p-0 font-normal aria-selected:opacity-100",
        ),
        day_range_start: "day-range-start",
        day_range_end: "day-range-end",
        day_selected: cn(dayVariants({ variant: variant === 'reschedule' ? 'reschedule' : 'default' })), 
        day_today: "bg-accent text-accent-foreground",
        day_outside:
          "day-outside text-muted-foreground opacity-50  aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ ...props }) => <ChevronLeftIcon className="h-4 w-4" />,
        IconRight: ({ ...props }) => <ChevronRightIcon className="h-4 w-4" />,
        // Day: ({ date, displayMonth }) => {
        //   return props.selected &&
        //     Array.isArray(props.selected) &&
        //     props.selected.some(
        //       (selectedDate) =>
        //         selectedDate.setHours(0, 0, 0, 0) === date.setHours(0, 0, 0, 0),
        //     ) ? (
        //     <Popover>
        //       <PopoverTrigger className="relative">
        //         <Button
        //           variant={"ghost"}
        //           className={cn(
        //             dayVariants({ variant }),
        //             "flex h-8 w-8 gap-0.5 p-0 font-normal aria-selected:opacity-100",
        //           )}
        //         >
        //           {date.getDate()}
        //           <div className="h-1 w-1 rounded-full bg-white"></div>
        //         </Button>
        //       </PopoverTrigger>
        //       <PopoverContent className="w-fit">
        //         <div className="flex flex-col gap-2">
        //           <h3 className="text-sm font-semibold text-gray-700">Slots</h3>
        //           <p className="flex flex-col gap-1 text-xs">
        //             <span className="text-gray-600">9:00 AM - 11:00 AM</span>
        //             <span className="text-gray-600">5:00 PM - 6:00 PM</span>
        //           </p>
        //         </div>
        //       </PopoverContent>
        //     </Popover>
        //   ) : (
        //     <Day date={date} displayMonth={displayMonth} />
        //   );
        // },
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
