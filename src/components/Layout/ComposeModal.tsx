import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import ComposeForm from './ComposeForm'

export default function ComposeModal({
  open,
  onOpenChange
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='flex max-h-[90vh] w-[90%] max-w-xl flex-col overflow-hidden rounded-xl p-0'>
        <DialogHeader className='border-b border-slate-200 px-4 py-3 text-left dark:border-white/10'>
          <DialogTitle>Compose message</DialogTitle>
          <DialogDescription>
            Draft and send a new email from your Mailico workspace.
          </DialogDescription>
        </DialogHeader>
        <div className='overflow-y-auto p-0'>
          <ComposeForm onSent={() => onOpenChange(false)} />
        </div>
      </DialogContent>
    </Dialog>
  )
}
