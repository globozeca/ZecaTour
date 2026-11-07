'use client';

import {useState} from 'react';
import {createClient} from '@/lib/supabase/client';

type GalleryItem = {
  id: string;
  title: Record<string, string> | null;
  alt_text: Record<string, string> | null;
  image_path: string;
  sort_order: number;
  is_published: boolean;
};

export default function GalleryManager({
  tenantId,
  initialItems
}: {
  tenantId: string;
  initialItems: GalleryItem[];
}) {
  const [items, setItems] = useState(initialItems);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function upload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const input = form.elements.namedItem('image') as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setMessage('Formato inválido. Utilize JPG, PNG ou WebP.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setMessage('A imagem ultrapassa o limite de 5 MB.');
      return;
    }

    setBusy(true);
    setMessage('');
    const supabase = createClient();
    const extension = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
    const path = tenantId + '/' + crypto.randomUUID() + '.' + extension;
    const {error: uploadError} = await supabase.storage.from('tenant-gallery').upload(path, file, {
      cacheControl: '31536000',
      contentType: file.type,
      upsert: false
    });
    if (uploadError) {
      setMessage('Não foi possível carregar a imagem. Verifique as permissões do Storage.');
      setBusy(false);
      return;
    }

    const title = (form.elements.namedItem('title') as HTMLInputElement).value.trim();
    const alt = (form.elements.namedItem('alt') as HTMLInputElement).value.trim();
    const {data, error} = await supabase.from('galleries').insert({
      tenant_id: tenantId,
      title: {pt: title, en: title, fr: title},
      alt_text: {pt: alt || title, en: alt || title, fr: alt || title},
      image_path: path,
      sort_order: items.length,
      is_published: true
    }).select('id,title,alt_text,image_path,sort_order,is_published').single();

    if (error || !data) {
      await supabase.storage.from('tenant-gallery').remove([path]);
      setMessage('A imagem foi carregada, mas não foi possível guardar o registo da galeria.');
    } else {
      setItems((current) => [...current, data as GalleryItem]);
      form.reset();
      setMessage('Fotografia adicionada e publicada.');
    }
    setBusy(false);
  }

  async function togglePublished(item: GalleryItem) {
    setBusy(true);
    const next = !item.is_published;
    const {error} = await createClient().from('galleries').update({is_published: next}).eq('id', item.id).eq('tenant_id', tenantId);
    if (error) setMessage('Não foi possível actualizar a publicação.');
    else setItems((current) => current.map((entry) => entry.id === item.id ? {...entry, is_published: next} : entry));
    setBusy(false);
  }

  async function remove(item: GalleryItem) {
    if (!window.confirm('Eliminar definitivamente esta fotografia?')) return;
    setBusy(true);
    const supabase = createClient();
    const {error: rowError} = await supabase.from('galleries').delete().eq('id', item.id).eq('tenant_id', tenantId);
    if (rowError) {
      setMessage('Não foi possível eliminar a fotografia.');
      setBusy(false);
      return;
    }
    await supabase.storage.from('tenant-gallery').remove([item.image_path]);
    setItems((current) => current.filter((entry) => entry.id !== item.id));
    setMessage('Fotografia eliminada.');
    setBusy(false);
  }

  const publicUrl = (path: string) => createClient().storage.from('tenant-gallery').getPublicUrl(path).data.publicUrl;

  return <section className="rounded-2xl bg-white p-6 sm:p-8">
    <div>
      <h2 className="text-xl font-semibold">Galeria de fotografias</h2>
      <p className="mt-2 text-sm text-[#66756d]">JPG, PNG ou WebP · máximo 5 MB por imagem.</p>
    </div>
    <form onSubmit={upload} className="mt-6 grid gap-3 sm:grid-cols-2">
      <input name="title" required maxLength={120} placeholder="Título da fotografia" className="rounded-xl border border-[#d5cfc3] px-4 py-3"/>
      <input name="alt" maxLength={160} placeholder="Texto alternativo (acessibilidade)" className="rounded-xl border border-[#d5cfc3] px-4 py-3"/>
      <input name="image" required type="file" accept="image/jpeg,image/png,image/webp" className="rounded-xl border border-[#d5cfc3] px-4 py-3 text-sm sm:col-span-2"/>
      <button disabled={busy} className="rounded-full bg-[#173b35] px-6 py-3 font-semibold text-white disabled:opacity-50 sm:justify-self-start">{busy ? 'A processar…' : 'Carregar fotografia'}</button>
    </form>
    {message && <p role="status" className="mt-4 rounded-xl bg-[#e7eee8] p-3 text-sm">{message}</p>}
    {items.length ? <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => <article key={item.id} className="overflow-hidden rounded-xl border border-[#e1dbcf]">
        <img src={publicUrl(item.image_path)} alt={item.alt_text?.pt || item.title?.pt || ''} className="aspect-[4/3] w-full object-cover"/>
        <div className="space-y-3 p-4">
          <p className="font-semibold">{item.title?.pt || 'Fotografia'}</p>
          <p className="text-xs text-[#66756d]">{item.is_published ? 'Publicada no website' : 'Não publicada'}</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={busy} onClick={() => togglePublished(item)} className="rounded-full border border-[#d5cfc3] px-3 py-2 text-xs">{item.is_published ? 'Ocultar' : 'Publicar'}</button>
            <button type="button" disabled={busy} onClick={() => remove(item)} className="rounded-full border border-red-200 px-3 py-2 text-xs text-red-700">Eliminar</button>
          </div>
        </div>
      </article>)}
    </div> : <p className="mt-8 rounded-xl border border-dashed border-[#cfc8ba] p-6 text-sm text-[#66756d]">Ainda não existem fotografias. Adicione a primeira imagem acima.</p>}
  </section>;
}
