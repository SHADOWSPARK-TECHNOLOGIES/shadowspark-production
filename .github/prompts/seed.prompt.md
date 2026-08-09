Create/refresh prisma/seed.ts: 1 tenant demo-lending; 3 users (admin@, manager@, agent@
/ Demo@1234 bcrypt); 15 loans (full status enum, 30-day spread); 20 KYC docs; 20 messages
(some Pidgin); 5 workflows; 20 audit logs; 10 repayments. Idempotent upserts.
Run against LOCAL postgres only. Verify row counts via datasource. Report counts table.
