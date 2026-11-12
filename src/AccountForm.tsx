import {useState, type FormEvent} from 'react';
import {LoaderCircle} from 'lucide-react';
import {Dialog, type Field} from './ui';
import {CustomerRegionFields} from './CustomerRegionFields';
import {localizedLabel, tr, useLanguage} from './i18n';
import {friendlyError} from './store';

/** Customer-specific form keeps region dependencies out of generic EntityForm. */
export function AccountForm({title, initial, fields, onSave, onClose}: {
  title: string; initial: Record<string, any>; fields: Field[];
  onSave: (row: Record<string, any>) => Promise<void>; onClose: () => void;
}) {
  useLanguage();
  const [values, setValues] = useState({...initial});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (key: string, value: unknown) => setValues(current => ({...current, [key]: value}));
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError('');
    try {
      for (const field of fields) if (field.required && !String(values[field.key] ?? '').trim()) throw Error(tr('{{value0}} wajib diisi.', {value0: tr(field.label)}));
      await onSave(values);
    } catch (error) {setError(friendlyError(error));} finally {setBusy(false);}
  }
  return <Dialog title={title} wide onClose={() => {if (!busy) onClose();}}><form onSubmit={event => void submit(event)}>
    <div className="dialog-body"><div className="form-grid">{fields.map((field, index) => {
      if (field.key === 'city') return null;
      if (field.key === 'province') return <CustomerRegionFields key="regions" province={values.province || ''} city={values.city || ''} disabled={busy} onChange={region => setValues(current => ({...current, ...region}))}/>;
      return <label key={field.key} className={`field ${field.type === 'textarea' ? 'full' : ''}`}><span>{tr(field.label)}{field.required && <b className="required"> *</b>}</span>
        {field.type === 'textarea' ? <textarea required={field.required} rows={4} maxLength={15000} disabled={busy} value={values[field.key] ?? ''} onChange={event => set(field.key, event.target.value)}/> : field.type === 'select' ? <select required={field.required} disabled={busy} value={values[field.key] ?? ''} onChange={event => set(field.key, event.target.value)}><option value="">{tr('Pilih…')}</option>{field.options?.map(option => <option key={option.value} value={option.value}>{localizedLabel(option)}</option>)}</select> : <input autoFocus={index === 0} type="text" required={field.required} maxLength={500} disabled={busy} value={values[field.key] ?? ''} onChange={event => set(field.key, event.target.value)}/>}
        {field.help && <small>{tr(field.help)}</small>}
      </label>;
    })}</div>{error && <div role="alert" className="form-error">{error}</div>}</div>
    <div className="dialog-footer"><button type="button" className="btn secondary" disabled={busy} onClick={onClose}>{tr('Batal')}</button><button className="btn primary" disabled={busy}>{busy && <LoaderCircle className="spin" size={16}/>} {tr('Simpan')}</button></div>
  </form></Dialog>;
}
