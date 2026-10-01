/* Version 2 keeps the version 1 storage keys and field names for compatibility. */
const HjortData = (() => {
  const defaults = {bookings:[],renters:[],blacklist:[],settings:{memberPrice:1000,friendPrice:1500,otherPrice:1500,deposit:500}};
  const clone = value => JSON.parse(JSON.stringify(value));
  const normalize = value => String(value ?? '').normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase('da');
  const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  const amount = value => value !== '' && value !== null && (typeof value === 'number' || typeof value === 'string') && Number.isFinite(Number(value)) && Number(value) >= 0;
  function validDate(value) {
    if(typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const d = new Date(value+'T12:00:00Z');
    return Number.isFinite(d.getTime()) && d.toISOString().slice(0,10) === value;
  }
  function validate(raw, strict = false) {
    if(!object(raw)) throw new Error('Sikkerhedskopien skal indeholde Hjortemosen-data.');
    if(strict && !['bookings','renters','blacklist','settings'].every(k=>Object.hasOwn(raw,k))) throw new Error('Sikkerhedskopien mangler bookinger, lejere, blacklist eller indstillinger.');
    const result = {...clone(defaults),...clone(raw)};
    for(const kind of ['bookings','renters','blacklist']) {
      if(!Array.isArray(result[kind]) || result[kind].length > 10000) throw new Error('Ugyldig liste: '+kind);
      const ids = new Set(), dates = new Set();
      for(const record of result[kind]) {
        if(!object(record) || typeof record.id !== 'string' || !record.id || typeof record.name !== 'string' || !record.name.trim()) throw new Error('En post mangler ID eller navn.');
        if(ids.has(record.id)) throw new Error('Sikkerhedskopien indeholder samme ID flere gange.');
        ids.add(record.id);
        for(const field of ['houseNo','house','phone','email','address','notes','reason']) if(record[field] !== undefined && typeof record[field] !== 'string') throw new Error('Et tekstfelt har et ugyldigt format.');
        if(kind === 'bookings') {
          if(strict && dates.has(record.date)) throw new Error('Sikkerhedskopien har flere bookinger på samme dato.');
          dates.add(record.date);
          if(!validDate(record.date) || !['member','friend','other'].includes(record.type) || !amount(record.price) || (record.deposit !== undefined && !amount(record.deposit))) throw new Error('En booking har ugyldig dato, lejertype eller beløb.');
          for(const field of ['paid','depositPaid']) if(record[field] !== undefined && typeof record[field] !== 'boolean') throw new Error('Ugyldig betalingsstatus.');
        }
      }
    }
    if(!object(result.settings)) throw new Error('Indstillinger har et ugyldigt format.');
    result.settings = {...defaults.settings,...result.settings,friendPrice:result.settings.friendPrice ?? result.settings.otherPrice ?? defaults.settings.friendPrice};
    for(const field of ['memberPrice','friendPrice','otherPrice','deposit']) {
      if(!amount(result.settings[field])) throw new Error('Standardpriser skal være positive beløb eller nul.');
      result.settings[field] = Number(result.settings[field]);
    }
    return result;
  }
  const outstanding = b => (b.paid ? 0 : Number(b.price||0)) + (b.depositPaid ? 0 : Number(b.deposit||0));
  const blocked = (list,name,garden) => list.find(r => (normalize(name) && normalize(r.name) === normalize(name)) || (normalize(garden) && normalize(r.house || r.houseNo) === normalize(garden)));
  function merge(current, incoming) {
    const merged = clone(current);
    for(const b of incoming.bookings) {
      const same = merged.bookings.find(x=>x.id===b.id);
      if(same) {
        const fields=['date','name','houseNo','phone','email','address','type','price','deposit','paid','depositPaid','notes'];
        if(fields.some(k => String(same[k]??'') !== String(b[k]??''))) throw new Error('Bookingen for '+b.name+' findes med andre oplysninger. Vælg erstatning, hvis kopien skal bruges.');
      } else {
        if(merged.bookings.some(x=>x.date===b.date)) throw new Error('Kan ikke flette: datoen '+b.date+' er allerede booket.');
        merged.bookings.push(clone(b));
      }
    }
    for(const kind of ['renters','blacklist']) for(const r of incoming[kind]) {
      const existing=merged[kind].find(x=>x.id===r.id || (normalize(x.name)===normalize(r.name) && normalize(x.houseNo||x.house)===normalize(r.houseNo||r.house)));
      if(existing?.id===r.id && (normalize(existing.name)!==normalize(r.name) || normalize(existing.houseNo||existing.house)!==normalize(r.houseNo||r.house))) throw new Error('Kan ikke flette: samme ID har forskellige navne eller have numre.');
      if(!existing) merged[kind].push(clone(r));
      else if(kind==='renters') { for(const k of ['phone','email','address']) if(!existing[k] && r[k]) existing[k]=r[k]; }
      else if(kind==='blacklist' && r.reason && !String(existing.reason||'').includes(r.reason)) existing.reason = [existing.reason,r.reason].filter(Boolean).join('\n');
    }
    return validate(merged);
  }
  return {defaults,clone,normalize,validDate,validate,outstanding,blocked,merge};
})();
