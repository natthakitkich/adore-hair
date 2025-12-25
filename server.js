import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

app.get('/bookings', async (req,res)=>{
  const { date } = req.query;
  const { data } = await supabase
    .from('bookings')
    .select('*')
    .eq('date', date)
    .order('time');
  res.json(data);
});

app.post('/bookings', async (req,res)=>{
  const { error } = await supabase.from('bookings').insert([req.body]);
  if (error) res.json({error:error.message});
  else res.json({success:true});
});

app.delete('/bookings/:id', async (req,res)=>{
  await supabase.from('bookings').delete().eq('id', req.params.id);
  res.json({success:true});
});

app.get('/slots', async (req,res)=>{
  const { date } = req.query;
  const slots = {};
  for (let h=13; h<=22; h++) {
    const t = `${String(h).padStart(2,'0')}:00`;
    slots[t] = { Bank:false, Sindy:false, Assist:false };
  }

  const { data } = await supabase
    .from('bookings')
    .select('time, stylist')
    .eq('date', date);

  data.forEach(b => slots[b.time][b.stylist] = true);
  res.json({slots});
});

app.get('/calendar', async (req,res)=>{
  const { month } = req.query;
  const start = `${month}-01`;
  const end = `${month}-31`;

  const { data } = await supabase
    .from('bookings')
    .select('date')
    .gte('date', start)
    .lte('date', end);

  const days = {};
  data.forEach(b=>{
    const d = Number(b.date.split('-')[2]);
    days[d] = true;
  });

  const result = [];
  for (let i=1;i<=31;i++) {
    result.push({ day:i, hasBooking:!!days[i] });
  }

  res.json(result);
});

app.listen(3000, ()=>console.log('Server running'));
