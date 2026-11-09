import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--glass-bg)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--glass-border)",
          "--border-radius": "1.25rem",
        } as React.CSSProperties
      }
      toastOptions={{ classNames: { toast: "glass" } }}
      {...props}
    />
  )
}

export { Toaster }
