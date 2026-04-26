# Guion — video de entrega GroupsApp (≈ 15 min, voz en corridos)

**Regla:** en cada toma **habla una sola persona**; el otro en **silencio** (sin *off*). **Corte duro** entre tomas; luego encadenáis los *clips*.

**Equilibrio (objetivo en el ensayo):** **~6:30 a 7:00** de voz de **JJ** (consola AWS, tres tramos y opcional **CloudShell** con `kubectl`) y **~6:30 a 7:00** de voz de **Esteban** (repo, `k8s/`, demo, enunciado, cierre con agradecimiento a JJ en **una** frase, **sin** que JJ responda al mic). **Total** ≈ **14:30 – 15:00** (el reloj manda: recortar T2, T5 o T6 si os pasáis).

**Se eliminó** el antiguo bloque de *roles de colaboración* (ex–toma 7): no lo grabéis; pasáis de la toma de enunciado (T6) al **cierre**.

**Pantallas:** *Esteban* — GitHub/IDE, navegador, `docs/…`. *JJ* — consola **AWS** (EKS, EC2/NLB, RDS, S3, SG, etc.).

> Al acabar **cada** toma, **1–2 s** en silencio para corte limpio al editar.

---

## Reparto (tiempos orientativos: ajustad en el ensayo para equilibrar)

Suma aprox. **6 + 6:30 + 0:50 cierre**; con **ensayo** llevad a **7 + 7** min de voz cada uno + cierre. Si **JJ** queda por debajo de 6:30, **alargad** T3a (más EKS / *kubectl* en CloudShell) o T3c (más RDS, S3, ElastiCache). Si **Esteban** pasa de 7 min **antes** del cierre, **tijera** a T2 o T6.

| Toma | Quién | Min (≈) | De qué va (qué enseñar) |
| --- | --- | ---: | --- |
| **T1** | Esteban | 0:35 | Saludo, asignatura, nombres (JJ se nombra pero no habla). En 2 frases: arquitectura, nube, demo, enunciado. Cierre: *“Ahora muestro el repositorio”.* |
| **T2** | Esteban | 1:15 | Raíz del repo: `app/`, `api-gateway/`, `services/…`, `k8s/`, `proto/`. *Stack:* Next.js, 6 microservicios Nest, REST vía gateway, gRPC, Kafka, Redis, PostgreSQL, S3. Local: Docker Compose; nube: EKS. Informe: `docs/DESPLIEGUE-AWS-GROUPSAPP.md`. Cierre: *“Cede a JJ; yo me callo. Lo de la nube lo cuenta él en AWS”.* |
| **T3a** | **Solo JJ** | **2:00** | **EKS:** clúster, región, *namespace* `groupsapp`, *workloads* / *pods* en *Running*. Opcional: **CloudShell** y `kubectl -n groupsapp get pods`, `get svc` (sin pegar *secrets* ni *session*). |
| **T3b** | **Solo JJ** | **2:00** | **EC2 → Load balancers (NLB):** *listeners* (p. ej. 80), **DNS** del balanceador, encaje con *edge* y API. **15–30 s** de **Security Groups** o “línea de fuego” si aplica. |
| **T3c** | **Solo JJ** | **2:00** | **RDS** (estado, motor, Multi-AZ a alto nivel; **no** cadenas de conexión con password). **S3** (buckets *front* / *medios*, política/CORS a alto nivel). **ElastiCache** (Redis) si lo veis. Cierre: *“Vuelve Esteban con manifiestos y la demo”*; rematar que el detalle está en el informe. |
| **T4** | Esteban | 0:50 | Carpeta `k8s/`: orden de *apply* (00 → 20 → 30 → Kafka → 60 → 75 *edge*). *ConfigMap* y *secrets* (plantilla). *Build* con `NEXT_PUBLIC_*` hacia el NLB y *sync* a S3. **Sin** leer YAML completo. |
| **T5** | Esteban | 1:50 | Navegador, **URL pública** del *front* (no localhost): login o registro, grupo, mensaje; opc. adjunto; una frase de *presence* / WebSocket. *Fallback* con captura si el *live* falla. |
| **T6** | Esteban | 1:10 | Enunciado del curso (p. ej. ST0263 / SI3007): REST + gRPC + Kafka + datos (RDS, S3, tópicos) + coordinación (plano de Kubernetes / etcd). PDB, *health*, drenado — **breve**, sin leer toda la matriz. Un vistazo al `DESPLIEGUE-…` opcional. |
| **Cierre** | Esteban | 0:50 | Gracias, repositorio / entregable, enlace al informe. Agradecimiento a JJ en **una** frase (él no habla). Última *slide* o diagrama de arquitectura si queréis. |

**Suma aprox.:** Esteban 0:35+1:15+0:50+1:50+1:10+0:50 = **6:30**; JJ 2:00+2:00+2:00 = **6:00**; **redondead** a **7+7** alargando un poco T3a–c o T5 en el **ensayo**, hasta **~15 min** con cierre.

---

## Guion por toma: qué mostrar y qué decir

En **cada** toma hay dos bloques: **En pantalla** (qué compartir o *grabar* en cámara) y **Texto (qué decir)** (frase hecha; adaptad el *tono* a *natural* en el *ensayo*).

Lo de abajo es **texto de apoyo**; no hace falta memorizarlo. En **cursiva** en el guion: *cortes* o *transiciones* al *editor*.

### T1 — Solo Esteban (~0:35)

**En pantalla:** cámara, o *slide* fijo con *GroupsApp · Sistemas Distribuidos* y nombres *Esteban* / *JJ* (opcional).

**Texto (qué decir):**  
*“Hola, somos [Esteban] y [JJ]. Este video es del curso de Sistemas Distribuidos, proyecto **GroupsApp**: una plataforma de mensajería en grupos. Vamos a hacer tres cosas: explicar cómo está armada la arquitectura y el repositorio, enseñar el despliegue en **AWS** con el clúster **EKS** —eso lo ve JJ en consola—, y al final **demostrar** la app en vivo y enlazar con los requisitos del curso. Ahora muestro el repositorio.”*  
**→ corte**

---

### T2 — Solo Esteban (~1:15)

**En pantalla:** **GitHub** (vista de archivos de la raíz) o **VS Code** con el árbol: `app/`, `api-gateway/`, `services/` con al menos 4–5 carpetas visibles, `k8s/`, `proto/`, `docs/`. *Scroll* mínimo; se puede fijar una rama o el commit de entrega.

**Texto (qué decir):**  
*“El repositorio está en una sola *monorepo*. El *frontend* es **Next.js**, en `app` y *components*. El tráfico HTTP de los usuarios entra por un **API Gateway** en `api-gateway`. Detrás hay **seis microservicios** en Nest, cada uno en su carpeta bajo `services`: *auth, users, groups, messaging, media* y *presence*.*  
*La API al usuario es en **REST** hacia el gateway. Entre servicios usamos **gRPC**; las definiciones están en `proto`. Los eventos importantes van por **Apache Kafka** y la presencia en caliente a **Redis**. Cada servicio con datos tiene su lógica en **PostgreSQL**; los archivos o medios van a **S3**.*  
*Para desarrollar, lo podemos levantar con **Docker Compose**. En el entregable de producción lo llevamos a **Amazon EKS** con manifiestos en la carpeta `k8s`.*  
*Toda la arquitectura y el despliegue están documentados en el informe `docs/DESPLIEGUE-AWS-GROUPSAPP.md`.*  
*Ahora cede a JJ: en lo que se ve en la nube, él lo cuenta desde la consola de **AWS** y yo me quedo con el mic en silencio.”*  
**→ corte; pantalla a JJ (solo JJ habla en T3a)**

---

### T3a — Solo JJ (~2:00)

**En pantalla (consola AWS, región en la barra arriba):**  
- **EKS** — nombre del clúster; pestaña de carga o información.  
- Carga de trabajo / *Workloads* del clúster → *namespace* `groupsapp` — *Deployments* o *Pods* en *Running* (3–4 filas visibles alcanza).  
- **Opcional (solo si no filtra *secrets* en pantalla):** **CloudShell** y ejecutar `kubectl -n groupsapp get pods` y, si aplica, `get svc`. Si dudáis, **no** abráis CloudShell: con la consola basta.

**Texto (qué decir):**  
*“Ahora muestro la nube. Esto corre en **Amazon EKS**, Kubernetes administrado. Aquí está nuestro clúster, en [región, p. ej. *us-east-1*].*  
*En el *namespace* **groupsapp* están levantados el *api-gateway*, los *microservicios*, **Kafka* en *StatefulSet* y el *edge* *nginx* que pone en frente el balanceador. Vemos los *Pods* en *Running* y, donde aplica, más de una réplica.”*  
*Si tengo *CloudShell* sin exponer *tokens*:* “Con *kubectl* confirmamos en terminal los mismos nombres que en la consola, sin tocar a secretos.”*  

*Nota de *edición* (no *decir* al *mic*):* si T3a+3b+3c van en **un solo clip** de JJ, *continuáis* a T3b *sin* corte; si *son* tomas *aparte*, corte y solo JJ habla en T3b.

---

### T3b — Solo JJ (~2:00)

**En pantalla:** consola **EC2** (o búsqueda) → **Load balancers**; elegir el **Network Load Balancer** del proyecto; **Listeners** (puerto 80, etc.); en **Description** o **Detalles** el **DNS name** del balanceador. Opcional: pestaña o vista de *target groups* / dianas en *IP* o *estado* *healthy*.

Luego, **~20–30 s**: **EC2** → **Security groups** (uno vinculado a nodos o al NLB según lo tengáis) — solo *inbound* / puertos, **sin** mostrar nombres de *keys*.

**Texto (qué decir):**  
*“Desde el borde, el tráfico público llega a un **Network Load Balancer** [mostrar nombre]. En los *listeners* está, por ejemplo, el **80**; este **DNS** es el que usamos o el que mapea nuestro frente. Por detrás, *Kubernetes* encamina al *Service* del *edge* *nginx* y de ahí al *api-gateway* o al *WebSocket* según la ruta.”*  
*“A nivel de red, los **Security Groups** restringen quién toca a los *workers*, al balanceador, etc.; el detalle está en el **informe** y en el diagrama de *security groups*.”*  

**→ corte a T3c** (o *continuación* sin corte en el mismo clip con JJ)

---

### T3c — Solo JJ (~2:00)

**En pantalla:** **RDS** — *dashboard*; la instancia **PostgreSQL** del proyecto (estado *Available*); motor y versión; *Multi-AZ* si aplica. **No** *scroll* a *Master password* ni *conexión* *string* *completa* *con* *clave*.  
Luego **S3** — bucket(s) del *website* o del *front*; otro o carpeta de **medios** si aplica. Vista de *propiedades* o lista de *objetos* de ejemplo, sin nombres internos de *IAM* *secret*.

Opcional: **ElastiCache** — *cluster* Redis, estado *available*.

**Texto (qué decir):**  
*“Los datos estructurados viven en **Amazon RDS** con *PostgreSQL*: [nombre de la instancia], estado *Available*, y [sí o no] *Multi–AZ* a nivel de resumen. No leemos credenciales: el clúster las pasa por *ConfigMap* y *Secret* de *Kubernetes*.”*  
*“El *front* estático se publica en un **bucket S3**; los *media* o archivos también, según el diseño, con políticas e *IAM* como explica nuestro informe.”*  
*“*Redis* para *presence* está en **ElastiCache** [mostrar cluster / o *una frase* si no abrís pantalla].”*  
*“Más malla y diagramas están en el informe **DESPLIEGUE** en el repo. Dejo la palabra a *Esteban* con los *manifiestos* y la *demo* en el navegador*.”*  

**→ corte; pantalla a Esteban (solo *Esteban* en T4)**

---

### T4 — Solo Esteban (~0:50)

**En pantalla:** **VS Code** o **GitHub**, carpeta `k8s/` en vista de lista. Que se vean, por el nombre, archivos del estilo: `00-namespace`, `20-config`, `30-secrets.example` (o plantilla), *Kafka*, `60-applications`, `75-edge-nginx-nlb`… **No** abráis un *YAML* entero: solo nombres; si abrís uno, que sean 10–15 *líneas* como mucho. **Opcional:** terminal con `ls k8s` o similar.

**Texto (qué decir):**  
*“Aplicamos los *manifiestos* de *Kubernetes* en *orden* — primero *namespace* y *ConfigMap* con las *URLs* de *RDS* y *Kafka*; los *secretos* reales *no* van a *Git*, salen de la *plantilla*. Después *Kafka* en *StatefulSet*, luego los *Deployments* de los *microservicios* y, al final, el *edge* *nginx* con un *Service* tipo *Load Balancer* que pide en *AWS* el *NLB* a la *VPC*.”*  
*“En producción hacemos *build* del Next con las variables `NEXT_PUBLIC_*` hacia la URL pública del *API* y subimos el *out* a *S3* con `aws s3 sync` o el flujo descrito en el *informe*.”* *(A voz podéis decirlo natural, sin deletrear carácter a carácter.)*  

**→ corte**; opcional: **un solo clip** T4+T5+T6+Cierre (solo *Esteban*).

---

### T5 — Solo Esteban (~1:50)

**En pantalla:** **Navegador** — *URL* **pública** del *front* (S3, CloudFront, etc.); **no** *localhost*. Secuencia: *login* o *registro* → *grupo* → *mensaje* → (opcional) *adjuntar* *fichero* o *imagen*.

**Texto (qué decir) — mientras o justo después de *clicar*:**  
*“Abrimos al usuario final el *cliente* publicado: me registro o inicio sesión, abro o creo un *grupo* y envío un *mensaje* en tiempo casi *real*.”* **Si subís *archivo*:** *“Eso pasa por *media*–*service*; el objeto queda en *S3*, coherente con lo que viste en *AWS* con *JJ*.”*  
*“*Presence* y *Socket*.* *IO* llegan a *presence*–*service*; es el mismo borde y rutas que viste con JJ en consola.”*  
*Si no carga la red:* *“Mostramos una captura de respaldo del mismo flujo y seguimos.”*  

**→ corte**; o **T5*+*T6* *juntos* *misma* *pista* (solo *Esteban*).

---

### T6 — Solo Esteban (~1:10)

**En pantalla (opc.):** abrir `docs/DESPLIEGUE-AWS-GROUPSAPP.md` en la sección **Matriz** o **requisitos** (p. ej. §9); **scroll** corto 2–3 renglones, o **solo** narración sin cambiar de pestaña.

**Texto (qué decir):**  
*“Con el enunciado de Sistemas Distribuidos: comunicación **síncrona** — REST al *api*–*gateway* y gRPC entre servicios; **asíncrona** con Apache **Kafka**; **datos** en Postgres en **RDS** y en **S3**; y **coordinación** y resiliencia con el plano de **Kubernetes** en EKS, con **etcd** detrás. En el **informe** conectamos cada criterio con el código o los manifiestos, y documentamos además **PDB**, múltiples **réplicas**, drenado de nodo o pruebas a **/health** a través del NLB.”*  

**→ corte;** o seguido en un solo clip (T4–Cierre) si ahorra edición.

---

### Cierre — Solo Esteban (~0:50)

**En pantalla (opc.):** repositorio en **GitHub**; o **captura** del diagrama Mermaid de arquitectura del informe (exportada a PNG).

**Texto (qué decir):**  
*“Con esto terminamos. El **código** y los manifiestos de **Kubernetes** están en el repositorio que entregamos; toda la arquitectura y el despliegue están en `docs/DESPLIEGUE-AWS-GROUPSAPP.md` o en el PDF, si el curso lo pide. Gracias a **JJ** por mostrar la parte de nube y a la cátedra. Quedamos a disposición.”* — **JJ no responde** al mic; **fin** del vídeo.

**→ corte, fin**

---

## Si el bloque de JJ te queda corto (llegar a ~7 min de voz)

- **EKS** — *Add-ons*, versión de clúster o *nodos* (contexto, sin IDs sensibles).
- **S3** — CORS o bloqueo de acceso público a *alto* nivel, sin *keys* IAM en pantalla.
- **CloudShell** solo si no se ve *session* *token* en cámara; si dudas, no lo abráis.

---

## Orden de voz (una sola a la vez)

1. Esteban: T1 → T2  
2. JJ: T3a → T3b → T3c *(cortes solo entre 3a, 3b, 3c; Esteban mudo)*  
3. Esteban: T4 → T5 → T6 → Cierre  

**No** hay toma de “cómo nos repartimos el trabajo” (eliminada).

---

## Checklist pre-grabado

- [ ] **Ensayo con cronómetro** — comprobar que **JJ** roza **~6:30 a 7:00** de voz (no se quede en 2 min) y **Esteban** tampoco se pase de **~7:30** antes del cierre (o ajustar la tabla).  
- [ ] Nada de claves AWS visibles en pantalla (JJ).  
- [ ] URL del *front* y *health* anotadas (Esteban).  
- [ ] Cuenta y clúster listos; *pods* y NLB *ok* (JJ) antes de grabar.
