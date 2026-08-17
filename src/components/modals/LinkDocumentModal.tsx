import { useEffect, useState } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Label, Select, ErrorText } from '../ui/Field'
import { useData } from '../../data/store'
import { useToast } from '../../lib/toast'
import { sleep } from '../../lib/utils'

export function LinkDocumentModal({
  open,
  onClose,
  clientId,
  matterId,
}: {
  open: boolean
  onClose: () => void
  clientId: string
  matterId: string
}) {
  const { clientDocuments, documentTypes, linkDocumentToMatter } = useData()
  const { show } = useToast()
  const [documentId, setDocumentId] = useState('')
  const [showErrors, setShowErrors] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const linkableDocs = clientDocuments.filter((d) => d.clientId === clientId && !d.matterId)

  useEffect(() => {
    if (open) {
      setDocumentId(linkableDocs[0]?.id ?? '')
      setShowErrors(false)
    }
  }, [open])

  async function submit() {
    if (!documentId) {
      setShowErrors(true)
      return
    }
    setSubmitting(true)
    await sleep(400 + Math.random() * 200)
    linkDocumentToMatter(documentId, matterId)
    show('Document linked to this matter')
    setSubmitting(false)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Link Existing Document"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} loading={submitting} disabled={linkableDocs.length === 0}>
            Link Document
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {linkableDocs.length === 0 ? (
          <p className="text-sm text-ink-400">
            This client has no unlinked documents. Use "Add New Document" instead, or free up a document from another matter first.
          </p>
        ) : (
          <div>
            <Label>Document</Label>
            <Select value={documentId} onChange={(e) => setDocumentId(e.target.value)}>
              {linkableDocs.map((d) => {
                const type = documentTypes.find((t) => t.id === d.typeId)
                return (
                  <option key={d.id} value={d.id}>
                    {type?.name ?? 'Document'}
                    {d.number ? ` — ${d.number}` : ''}
                  </option>
                )
              })}
            </Select>
            {showErrors && !documentId && <ErrorText>Select a document to link</ErrorText>}
          </div>
        )}
      </div>
    </Modal>
  )
}
