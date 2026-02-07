# Configuración de Supabase para CORE Fitness

Para que el sistema funcione correctamente, sigue estos pasos después de aplicar el `supabase_schema.sql`.

## 1. Buckets de Almacenamiento (Storage)
En el panel de Supabase -> Storage, crea los siguientes buckets:

1.  **`exercise-videos`**:
    *   **Público**: Sí.
    *   **Uso**: Almacenar los videos de demostración de los ejercicios.
    *   **RLS**: 
        *   `SELECT`: Permitir a todos (Public).
        *   `INSERT/UPDATE/DELETE`: Solo usuarios con rol 'admin'.

2.  **`user-checkins`**:
    *   **Público**: No.
    *   **Uso**: Fotos de progreso y correcciones de postura enviadas por chat.
    *   **RLS**: 
        *   `SELECT`: Solo el dueño (owner) y el admin.
        *   `INSERT`: Solo usuarios autenticados.

## 2. Activación de Real-time
Para que el chat sea instantáneo:
1.  Ve a **Database** -> **Publications**.
2.  Haz clic en la publicación llamada **`supabase_realtime`**.
3.  Activa los interruptores para las tablas **`messages`** y **`chats`**.
4.  Guarda los cambios.

## 3. Función de Carga de Archivos (Frontend Logic)
Al subir archivos desde React, usa este patrón para nombres únicos:
```javascript
const fileExt = file.name.split('.').pop();
const fileName = `${crypto.randomUUID()}_${Date.now()}.${fileExt}`;
const { data, error } = await supabase.storage
  .from('exercise-videos')
  .upload(fileName, file);
```

## 4. Notas de Seguridad (RLS)
El archivo SQL ya incluye las políticas básicas. Asegúrate de que al crear un bucket en la UI de Supabase, las políticas de Storage coincidan con los roles definidos en la tabla `profiles`.
