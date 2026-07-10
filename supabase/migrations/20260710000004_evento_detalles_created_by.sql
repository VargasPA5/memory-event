-- ============================================================================
-- Memory Events — Auditoría ligera para detalles operativos de eventos
-- ============================================================================
-- Las tablas hijas de eventos no tienen updated_at/updated_by, por eso no pueden
-- reutilizar fn_set_audit_fields(). Esta función solo garantiza created_at y
-- created_by sin depender del frontend.

create or replace function fn_set_evento_detalle_created_by()
returns trigger language plpgsql as $$
begin
  if TG_OP = 'INSERT' then
    new.created_at := coalesce(new.created_at, now());
    new.created_by := auth.uid();
  elsif TG_OP = 'UPDATE' then
    new.created_at := old.created_at;
    new.created_by := old.created_by;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_audit_evento_platos on evento_platos;
create trigger trg_audit_evento_platos
before insert or update on evento_platos
for each row execute function fn_set_evento_detalle_created_by();

drop trigger if exists trg_audit_evento_decoraciones on evento_decoraciones;
create trigger trg_audit_evento_decoraciones
before insert or update on evento_decoraciones
for each row execute function fn_set_evento_detalle_created_by();

drop trigger if exists trg_audit_evento_agenda on evento_agenda;
create trigger trg_audit_evento_agenda
before insert or update on evento_agenda
for each row execute function fn_set_evento_detalle_created_by();

drop trigger if exists trg_audit_evento_checklist on evento_checklist;
create trigger trg_audit_evento_checklist
before insert or update on evento_checklist
for each row execute function fn_set_evento_detalle_created_by();

drop trigger if exists trg_audit_evento_comentarios on evento_comentarios;
create trigger trg_audit_evento_comentarios
before insert or update on evento_comentarios
for each row execute function fn_set_evento_detalle_created_by();
