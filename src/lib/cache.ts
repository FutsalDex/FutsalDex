
interface CacheEntry<T> {
    data: T;
    timestamp: number;
  }
  
  // Un simple almacén de caché en memoria
  const memoryCache = new Map<string, CacheEntry<any>>();
  
  /**
   * Obtiene un valor de la caché. Devuelve null si no existe o ha expirado.
   * @param key La clave única para el dato cacheado.
   * @param ttl El tiempo de vida en milisegundos.
   */
  export function getFromCache<T>(key: string, ttl: number): T | null {
    const entry = memoryCache.get(key);
  
    // Si no hay entrada, no hay caché
    if (!entry) {
      return null;
    }
  
    const isExpired = (Date.now() - entry.timestamp) > ttl;
  
    // Si la caché ha expirado, la eliminamos y devolvemos null
    if (isExpired) {
      memoryCache.delete(key);
      return null;
    }
  
    console.log(`CACHE HIT: Sirviendo datos desde la caché para la clave "${key}".`);
    return entry.data as T;
  }
  
  /**
   * Guarda un valor en la caché.
   * @param key La clave única para el dato cacheado.
   * @param data El dato a guardar.
   */
  export function setInCache<T>(key: string, data: T) {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
    };
    memoryCache.set(key, entry);
    console.log(`CACHE SET: Guardando datos en caché para la clave "${key}".`);
  }
