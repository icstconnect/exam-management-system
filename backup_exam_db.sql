--
-- PostgreSQL database dump
--

\restrict S1O1YumOJYXyGshogzFho1HdF21sr7P0IceTry9afjeaxxiwPolPbtdvEENdLVp

-- Dumped from database version 15.18
-- Dumped by pg_dump version 15.18

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY public.student_responses DROP CONSTRAINT IF EXISTS student_responses_session_id_fkey;
ALTER TABLE IF EXISTS ONLY public.student_responses DROP CONSTRAINT IF EXISTS student_responses_question_id_fkey;
ALTER TABLE IF EXISTS ONLY public.questions DROP CONSTRAINT IF EXISTS questions_section_id_fkey;
ALTER TABLE IF EXISTS ONLY public.questions DROP CONSTRAINT IF EXISTS questions_exam_id_fkey;
ALTER TABLE IF EXISTS ONLY public.exam_sessions DROP CONSTRAINT IF EXISTS exam_sessions_student_id_fkey;
ALTER TABLE IF EXISTS ONLY public.exam_sessions DROP CONSTRAINT IF EXISTS exam_sessions_exam_id_fkey;
ALTER TABLE IF EXISTS ONLY public.exam_sections DROP CONSTRAINT IF EXISTS exam_sections_exam_id_fkey;
ALTER TABLE IF EXISTS ONLY public.students DROP CONSTRAINT IF EXISTS students_pkey;
ALTER TABLE IF EXISTS ONLY public.student_responses DROP CONSTRAINT IF EXISTS student_responses_pkey;
ALTER TABLE IF EXISTS ONLY public.questions DROP CONSTRAINT IF EXISTS questions_pkey;
ALTER TABLE IF EXISTS ONLY public.exams DROP CONSTRAINT IF EXISTS exams_pkey;
ALTER TABLE IF EXISTS ONLY public.exam_sessions DROP CONSTRAINT IF EXISTS exam_sessions_pkey;
ALTER TABLE IF EXISTS ONLY public.exam_sessions DROP CONSTRAINT IF EXISTS exam_sessions_exam_id_student_id_key;
ALTER TABLE IF EXISTS ONLY public.exam_sections DROP CONSTRAINT IF EXISTS exam_sections_pkey;
ALTER TABLE IF EXISTS ONLY public.download_audit_logs DROP CONSTRAINT IF EXISTS download_audit_logs_pkey;
DROP TABLE IF EXISTS public.students;
DROP TABLE IF EXISTS public.student_responses;
DROP TABLE IF EXISTS public.questions;
DROP TABLE IF EXISTS public.exams;
DROP TABLE IF EXISTS public.exam_sessions;
DROP TABLE IF EXISTS public.exam_sections;
DROP TABLE IF EXISTS public.download_audit_logs;
SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: download_audit_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.download_audit_logs (
    log_id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id character varying(3) NOT NULL,
    exam_id uuid NOT NULL,
    session_id uuid NOT NULL,
    download_timestamp timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    ip_address character varying(45)
);


ALTER TABLE public.download_audit_logs OWNER TO postgres;

--
-- Name: exam_sections; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.exam_sections (
    section_id uuid DEFAULT gen_random_uuid() NOT NULL,
    exam_id uuid NOT NULL,
    title character varying(255) NOT NULL,
    section_marks integer NOT NULL,
    section_type character varying(20) NOT NULL,
    CONSTRAINT exam_sections_section_type_check CHECK (((section_type)::text = ANY ((ARRAY['MCQ'::character varying, 'FITB'::character varying, 'TF'::character varying, 'MATCH'::character varying])::text[])))
);


ALTER TABLE public.exam_sections OWNER TO postgres;

--
-- Name: exam_sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.exam_sessions (
    session_id uuid DEFAULT gen_random_uuid() NOT NULL,
    exam_id uuid NOT NULL,
    student_id character varying(3) NOT NULL,
    status character varying(20) NOT NULL,
    password_provided character varying(100) NOT NULL,
    tab_violation_count integer DEFAULT 0 NOT NULL,
    seconds_left integer,
    last_active_timestamp timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    score numeric(5,2) DEFAULT 0,
    CONSTRAINT exam_sessions_status_check CHECK (((status)::text = ANY ((ARRAY['READY'::character varying, 'LOGGED_IN'::character varying, 'EXAMINEE'::character varying, 'PAUSED'::character varying, 'COMPLETED'::character varying, 'ABSENT'::character varying])::text[])))
);


ALTER TABLE public.exam_sessions OWNER TO postgres;

--
-- Name: exams; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.exams (
    exam_id uuid DEFAULT gen_random_uuid() NOT NULL,
    title character varying(255) NOT NULL,
    duration_minutes integer NOT NULL,
    target_batch character varying(50) NOT NULL,
    full_marks integer DEFAULT 100 NOT NULL,
    status character varying(20) NOT NULL,
    scheduled_start timestamp without time zone,
    actual_start_time timestamp without time zone,
    actual_end_time timestamp without time zone,
    global_seconds_left integer,
    CONSTRAINT exams_status_check CHECK (((status)::text = ANY ((ARRAY['DRAFT'::character varying, 'CREATED'::character varying, 'STARTED'::character varying, 'PAUSED'::character varying, 'ENDED'::character varying])::text[])))
);


ALTER TABLE public.exams OWNER TO postgres;

--
-- Name: questions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.questions (
    question_id uuid DEFAULT gen_random_uuid() NOT NULL,
    exam_id uuid NOT NULL,
    section_id uuid NOT NULL,
    question_type character varying(20) NOT NULL,
    question_text_en text NOT NULL,
    question_text_bn text NOT NULL,
    options_json jsonb NOT NULL,
    correct_answer text NOT NULL,
    marks integer DEFAULT 1 NOT NULL,
    CONSTRAINT questions_question_type_check CHECK (((question_type)::text = ANY ((ARRAY['MCQ'::character varying, 'FITB'::character varying, 'TF'::character varying, 'MATCH'::character varying])::text[])))
);


ALTER TABLE public.questions OWNER TO postgres;

--
-- Name: student_responses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.student_responses (
    session_id uuid NOT NULL,
    question_id uuid NOT NULL,
    selected_option text,
    is_correct boolean,
    awarded_marks numeric(5,2)
);


ALTER TABLE public.student_responses OWNER TO postgres;

--
-- Name: students; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.students (
    student_id character varying(3) NOT NULL,
    name character varying(255) NOT NULL,
    phone_no character varying(20) NOT NULL,
    class character varying(50) NOT NULL,
    batch character varying(50)
);


ALTER TABLE public.students OWNER TO postgres;

--
-- Data for Name: download_audit_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.download_audit_logs (log_id, student_id, exam_id, session_id, download_timestamp, ip_address) FROM stdin;
f3f0b683-47a7-4130-b599-849baeba6f3d	001	a3fb44bf-3913-48dd-a99c-630c93590f7e	949f9303-7016-4b09-a15b-a5013586b133	2026-06-30 06:32:43.783692	192.168.0.104
cde6c895-1775-45eb-82b8-d3b8e261a730	001	73b1bfda-2c7e-4567-93f9-96cbafc00b8c	d812c025-14ed-4c09-94a3-182a2863b519	2026-06-30 06:54:36.414771	192.168.0.106
ccfc9370-989e-477f-a80a-9e6f0028e9b1	001	73b1bfda-2c7e-4567-93f9-96cbafc00b8c	3a0bcfd5-b330-46d9-976c-4eaa500a7cde	2026-06-30 08:23:55.874652	192.168.0.104
08e902ad-e51e-4879-b212-05ba817d0e4c	007	73b1bfda-2c7e-4567-93f9-96cbafc00b8c	f3831437-a9d0-4a00-ac02-51013de49562	2026-06-30 15:38:23.618038	192.168.0.123
64bc18a7-fd25-4781-905a-56cd1630bd13	005	73b1bfda-2c7e-4567-93f9-96cbafc00b8c	e1b9682f-4784-4af9-a8db-5cd8a79294b8	2026-06-30 15:38:23.794079	192.168.0.131
3873f29c-afab-4be2-a32d-ea4d4274db32	001	54bdfaf6-9c89-444c-b062-adbe1a688b92	f4833517-ab76-4f29-bade-36f5eae3e1c3	2026-07-01 11:33:15.140038	192.168.0.104
446f59cd-a7d4-4753-b212-3fc09f2b132c	001	fbe98b79-ad38-4774-a472-33cc1710198e	0ba550da-df3d-427a-95b9-383fa95b80df	2026-07-01 12:10:44.716254	192.168.0.104
75e37852-8dbf-42bb-8e68-77fa5d3a5e7e	001	fbe98b79-ad38-4774-a472-33cc1710198e	0ba550da-df3d-427a-95b9-383fa95b80df	2026-07-01 12:17:37.009714	192.168.0.104
b786802e-ab47-4e91-8c74-40721df4338b	001	4bfaf3ee-29e1-4590-be4e-e0877bf06d78	1a3bcccb-3592-4417-80ad-03c7a8caa79d	2026-07-01 13:22:14.667951	192.168.0.104
74f306c9-75e6-455d-83ea-6ba82a4d8504	001	4bfaf3ee-29e1-4590-be4e-e0877bf06d78	b86e4fe0-4bed-4b7f-a48c-d3a37ad7662c	2026-07-01 15:16:17.168544	192.168.0.104
82edbcf5-16b6-48c6-85f3-a4f32291f5b7	001	4bfaf3ee-29e1-4590-be4e-e0877bf06d78	de54af09-57d2-419c-89aa-57e34bef6d26	2026-07-01 15:27:35.040241	192.168.0.104
003c3446-7471-47c6-9e7d-e74dadaca875	001	4bfaf3ee-29e1-4590-be4e-e0877bf06d78	d24b3b3d-78f7-446f-a066-259483ed4449	2026-07-02 07:06:56.985701	192.168.0.131
fe77ad60-d272-4bec-a78e-b4009516b644	113	4bfaf3ee-29e1-4590-be4e-e0877bf06d78	a5978892-5ed3-495c-87e9-b5c6cb10ea4b	2026-07-02 12:34:26.347067	192.168.0.132
713c7841-8d38-4808-a9ec-3f673587c34b	001	4bfaf3ee-29e1-4590-be4e-e0877bf06d78	023b5d1e-37ba-4a7f-8d39-e3e56ab0ab7f	2026-07-02 13:46:50.227234	192.168.0.132
91d7190d-6656-4577-a781-e8e5d3c5b79e	046	4bfaf3ee-29e1-4590-be4e-e0877bf06d78	e44b9c81-906d-4feb-9406-bc5df356c8b3	2026-07-03 12:16:36.53593	192.168.0.127
15acb276-af7f-4092-bfc7-b27c396926fd	128	bf2481e7-1814-4acb-9380-0bc2b0adb542	e79e1a41-06a3-4a84-b514-05b16269085e	2026-07-03 13:25:58.954133	192.168.0.132
74e56045-0309-487e-ad5a-dd4f00c6a4f5	128	bf2481e7-1814-4acb-9380-0bc2b0adb542	25d78199-9cdd-40d9-9d52-2d2b9c70f7ce	2026-07-03 14:39:15.744005	192.168.0.132
cf6299e8-9a25-4186-b5c8-514b6ea450c8	128	bf2481e7-1814-4acb-9380-0bc2b0adb542	25d78199-9cdd-40d9-9d52-2d2b9c70f7ce	2026-07-03 14:48:01.991822	192.168.0.132
97ba59c1-357e-47f9-9d9e-7ed7049cddd2	128	bf2481e7-1814-4acb-9380-0bc2b0adb542	25d78199-9cdd-40d9-9d52-2d2b9c70f7ce	2026-07-03 14:54:50.83992	192.168.0.132
122ec6ff-ddb8-44bf-944b-81569911029d	128	bf2481e7-1814-4acb-9380-0bc2b0adb542	25d78199-9cdd-40d9-9d52-2d2b9c70f7ce	2026-07-03 14:56:31.785766	192.168.0.132
c836af22-14a8-4eb7-ae10-8a9f13c51e2f	128	bf2481e7-1814-4acb-9380-0bc2b0adb542	753c9219-1df7-4d1f-8d21-1b137b0191fb	2026-07-03 15:05:49.327132	192.168.0.104
852051e6-c9ca-49f3-b415-1e83e1f4c723	128	bf2481e7-1814-4acb-9380-0bc2b0adb542	4c8d8d99-cd12-45b3-9c3a-44c26cf4c64e	2026-07-03 15:11:00.88976	192.168.0.104
0cec90ae-efef-429a-bc8d-0ef769caa0ab	128	bf2481e7-1814-4acb-9380-0bc2b0adb542	24bcff2c-83e5-409f-a4fa-bbb4be6908a4	2026-07-03 15:34:41.940231	192.168.0.104
35abc06c-8d3c-485f-a4c5-b208ca5f689b	050	4bfaf3ee-29e1-4590-be4e-e0877bf06d78	c60e4431-e4f4-4dda-8620-2d18dd5dfe6c	2026-07-03 16:10:20.566097	192.168.0.104
6f4b81c9-4a5f-414c-8512-8b9e2c60bb0f	050	4bfaf3ee-29e1-4590-be4e-e0877bf06d78	24e3503b-7eaf-42b8-89a5-7d9dba089600	2026-07-04 04:31:28.990712	192.168.0.118
fa672c14-a1b2-44cd-ba6b-ae2522e12cdd	125	4bfaf3ee-29e1-4590-be4e-e0877bf06d78	79a9a47f-3545-4875-ba0b-4f2b4324be39	2026-07-04 04:31:43.010888	192.168.0.111
cf96afed-2621-488b-af3e-ce904d98d1b4	125	4bfaf3ee-29e1-4590-be4e-e0877bf06d78	79a9a47f-3545-4875-ba0b-4f2b4324be39	2026-07-04 04:32:09.237273	192.168.0.111
6a59dc27-70af-4ca5-9423-a7ea32a79dde	125	4bfaf3ee-29e1-4590-be4e-e0877bf06d78	79a9a47f-3545-4875-ba0b-4f2b4324be39	2026-07-04 04:32:21.476585	192.168.0.111
10bf0a1c-cd6c-4e7e-b3f2-99d00018be06	129	4bfaf3ee-29e1-4590-be4e-e0877bf06d78	1e3c7aa0-9622-4a4f-8b95-ab0c60c0453b	2026-07-04 04:35:04.86945	192.168.0.115
96114399-922d-4fd6-a6c9-4a5ba9a75a52	062	4bfaf3ee-29e1-4590-be4e-e0877bf06d78	2f602a81-b09b-4c20-bfad-72f83aba7e05	2026-07-04 04:35:37.842556	192.168.0.116
011eabaa-f192-4062-bab7-62ac782e43ea	142	4bfaf3ee-29e1-4590-be4e-e0877bf06d78	bdc82668-ec39-40f9-8555-42449cd34740	2026-07-04 04:36:10.722525	192.168.0.131
df223973-32c9-4c4b-b7f3-6e6d181fd631	142	4bfaf3ee-29e1-4590-be4e-e0877bf06d78	bdc82668-ec39-40f9-8555-42449cd34740	2026-07-04 04:36:18.485753	192.168.0.131
57406348-9e75-431d-8784-e4fbeebff218	127	4bfaf3ee-29e1-4590-be4e-e0877bf06d78	03ab548e-ebf8-48db-9edd-f1488a56bc9d	2026-07-04 04:36:47.158429	192.168.0.114
c20ebf5e-b898-47b1-9ae3-6321ce5c860d	037	4bfaf3ee-29e1-4590-be4e-e0877bf06d78	351eacd1-6321-4784-8841-870ab4c14af8	2026-07-04 04:37:58.430928	192.168.0.117
9edb4e32-4156-4597-877f-cf2d276d9b88	055	4bfaf3ee-29e1-4590-be4e-e0877bf06d78	33c74e71-28fb-453a-a774-36b74d602129	2026-07-04 04:38:22.536429	192.168.0.119
5e9ac852-ede6-45c6-84b3-ebbb918f7951	052	4bfaf3ee-29e1-4590-be4e-e0877bf06d78	ea82a606-80eb-485b-83b6-3d03c8d514ee	2026-07-04 04:41:16.219682	192.168.0.110
4b8ccc2d-db1e-4399-b9f8-d3692277e3f2	063	4bfaf3ee-29e1-4590-be4e-e0877bf06d78	dc9f7a74-b535-407f-8da2-0b9290b88dbb	2026-07-04 04:54:35.396729	192.168.0.113
8a4f506f-6fdd-4778-9845-41278761ac3a	128	bf2481e7-1814-4acb-9380-0bc2b0adb542	15226b52-4a12-4fb2-a4cc-2ed5965dbf55	2026-07-04 14:38:58.728777	192.168.0.131
d2047392-eaac-4f51-984a-d87e63004317	067	bf2481e7-1814-4acb-9380-0bc2b0adb542	82cca659-269e-4036-9309-48f7e878c255	2026-07-05 13:41:46.789842	192.168.0.123
cd545936-e59e-4006-a30c-d3faa674ad88	128	bf2481e7-1814-4acb-9380-0bc2b0adb542	7bf470ba-18d9-4871-8654-474a92bf6783	2026-07-05 13:45:41.087093	192.168.0.132
06265d4e-998d-4a07-b51b-b4497faf4463	141	bf2481e7-1814-4acb-9380-0bc2b0adb542	ca997e9b-acdb-423c-a008-b5faeb24d6f5	2026-07-06 11:14:10.996696	192.168.0.107
c32dd84f-3764-4ace-ab11-d2e15e35fab0	140	bf2481e7-1814-4acb-9380-0bc2b0adb542	00a7405d-ab37-4399-a40b-7f6b3158de74	2026-07-06 11:14:59.651644	192.168.0.105
1aaf9a86-c3e7-498b-9be4-e8dacc50ce72	128	bf2481e7-1814-4acb-9380-0bc2b0adb542	20ad5f99-4429-4196-834b-e166ac9ea560	2026-07-06 11:15:39.863743	192.168.0.113
7f9446cc-d046-4028-911e-20c7be56c679	060	bf2481e7-1814-4acb-9380-0bc2b0adb542	159182f4-ff10-497c-b0ce-c3adc8d012e0	2026-07-06 11:16:03.506913	192.168.0.132
c4ed5ac4-efda-409d-ad98-0d3f8693a9b9	124	bf2481e7-1814-4acb-9380-0bc2b0adb542	c7ca48e1-e77c-430f-8c24-9d2b49437647	2026-07-06 11:16:09.610865	192.168.0.110
17332315-025a-4a1f-ad6d-b7844db412fb	060	bf2481e7-1814-4acb-9380-0bc2b0adb542	159182f4-ff10-497c-b0ce-c3adc8d012e0	2026-07-06 11:16:22.687221	192.168.0.132
d561ad8b-59d7-4ef0-8db6-1c7b64b2c1f9	091	bf2481e7-1814-4acb-9380-0bc2b0adb542	65d884ae-716e-49c1-8121-58f69a917807	2026-07-06 11:16:53.30681	192.168.0.109
6acf26cf-39ee-47b2-bf35-b998713e27f5	071	bf2481e7-1814-4acb-9380-0bc2b0adb542	1f1931b8-3d5b-4428-b0f4-d5e30d18bfdb	2026-07-06 11:26:48.036818	192.168.0.116
91f27640-d4f9-46d8-b3d8-16bfedee80ec	106	bf2481e7-1814-4acb-9380-0bc2b0adb542	90622fdf-3569-4585-a4ff-4cba93424d68	2026-07-06 11:26:49.288577	192.168.0.115
a60ecff8-e9a0-4bbe-98da-b8c9972e064d	065	bf2481e7-1814-4acb-9380-0bc2b0adb542	5bedcf2b-c92f-429d-95d2-c316ee256fd1	2026-07-06 11:26:49.613862	192.168.0.118
ef1f39ad-5686-4b84-8f72-14ecdba45260	069	bf2481e7-1814-4acb-9380-0bc2b0adb542	f4538af3-2ee8-4aa9-b702-2513ce0274f0	2026-07-06 11:26:49.937283	192.168.0.114
982ba08e-067b-4043-818d-8970c9c594fb	090	bf2481e7-1814-4acb-9380-0bc2b0adb542	6522602f-343d-4545-b3b6-64fefe44f3a0	2026-07-06 11:26:50.824377	192.168.0.111
a939f5cb-095a-4502-b1d0-3200821275cd	067	bf2481e7-1814-4acb-9380-0bc2b0adb542	6cdb6697-0cc1-424b-a861-88722168dc54	2026-07-06 11:26:58.403576	192.168.0.117
468575e2-44eb-439b-8550-52de06c9baa0	068	bf2481e7-1814-4acb-9380-0bc2b0adb542	9931b37f-2ae5-4db9-9bac-ecbb8079627d	2026-07-06 11:26:59.250394	192.168.0.131
7cb1e4e8-85fd-4e98-81c0-0dd10f4f6e7a	141	bf2481e7-1814-4acb-9380-0bc2b0adb542	ca997e9b-acdb-423c-a008-b5faeb24d6f5	2026-07-07 05:54:35.482266	127.0.0.1
6d6ea9a6-a56e-4f03-a730-915d0ab86236	002	5c50aa70-a328-47ab-ad2e-ef4ae40aaf63	5231dd25-f11d-4a12-9987-f286742f364e	2026-07-07 11:35:20.134818	192.168.0.104
15b0c222-9260-447f-87a4-fcc83d60ae24	123	5c50aa70-a328-47ab-ad2e-ef4ae40aaf63	a6c77b0d-2939-4b6b-af4a-32e1c592d903	2026-07-09 12:00:09.371749	192.168.0.119
1bbaa17b-2dfc-4516-b996-a2dd86e8ebf7	138	5c50aa70-a328-47ab-ad2e-ef4ae40aaf63	2e568f7d-b4d1-4ff1-bdec-f67ea61c70bb	2026-07-09 12:05:00.98498	192.168.0.106
eec7545d-aa1f-4310-888e-f8dbaca67684	056	5c50aa70-a328-47ab-ad2e-ef4ae40aaf63	46a7e7a3-4f11-4d01-909b-1d0e06595da7	2026-07-09 12:05:21.798762	192.168.0.115
738265b9-209d-4539-9736-8100fe9db6ba	057	5c50aa70-a328-47ab-ad2e-ef4ae40aaf63	4344b05c-dda8-416d-bded-2516e9fa210c	2026-07-09 12:05:22.448961	192.168.0.117
015b4675-5e6e-44d1-9224-cd4630b4b0f6	049	5c50aa70-a328-47ab-ad2e-ef4ae40aaf63	8496b17b-6c20-49fe-8c07-fa91b30588b8	2026-07-09 12:09:02.912173	192.168.0.111
78f65465-b4f7-4492-bb42-9df767f5ecef	061	5c50aa70-a328-47ab-ad2e-ef4ae40aaf63	0ad9048b-f36f-4569-9c69-477db25385f4	2026-07-09 12:09:20.454016	192.168.0.131
46b46f1e-d611-4353-a624-ea049b15b519	073	5c50aa70-a328-47ab-ad2e-ef4ae40aaf63	722cf1a8-1f40-40e8-9092-54139aa2640d	2026-07-09 12:12:25.179761	192.168.0.110
5cb763ad-b39e-4b18-8b28-2d134f15942b	041	5c50aa70-a328-47ab-ad2e-ef4ae40aaf63	9e2f8337-9cd8-4506-b4d0-fc622fe06ca7	2026-07-09 12:14:22.992253	192.168.0.132
baf43e52-f36c-49bc-a448-6c6bb204c652	039	74d5a0b0-7659-43cc-89f0-499b6751139f	fbf6bdad-79eb-4dee-aade-c9627ccc00c9	2026-07-18 14:55:34.076844	192.168.0.104
c56a279f-0762-47a6-892a-746c68b7f5a3	133	74d5a0b0-7659-43cc-89f0-499b6751139f	7c6bc8a4-376a-4405-b0ab-fd312b3b728d	2026-07-19 04:21:07.434215	192.168.0.113
7702c3ce-7e17-46ee-913e-be2fd3a2e5f0	119	74d5a0b0-7659-43cc-89f0-499b6751139f	491e4671-6588-41ad-8fa8-f8073fd66d6d	2026-07-19 04:24:18.470358	192.168.0.116
95a26503-ff0b-4384-aae3-99a56f81bed9	130	74d5a0b0-7659-43cc-89f0-499b6751139f	da260c91-075f-4b69-9e4f-21e38e225b15	2026-07-19 04:24:44.659672	192.168.0.117
b169c2d0-c2db-460d-8300-8075166cf5b1	130	74d5a0b0-7659-43cc-89f0-499b6751139f	da260c91-075f-4b69-9e4f-21e38e225b15	2026-07-19 04:24:50.469227	192.168.0.117
34719662-317d-40ff-a276-78ae0368605d	039	74d5a0b0-7659-43cc-89f0-499b6751139f	df9b93cc-bd96-4fc8-b2b0-641df6dcb1d9	2026-07-19 04:25:55.05818	192.168.0.115
\.


--
-- Data for Name: exam_sections; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.exam_sections (section_id, exam_id, title, section_marks, section_type) FROM stdin;
433151b7-01c4-4900-a99d-8feb3e72891d	4bfaf3ee-29e1-4590-be4e-e0877bf06d78	Multiple Choice Question	5	MCQ
27fd18b7-2b5b-4284-9e6b-883a1199238f	4bfaf3ee-29e1-4590-be4e-e0877bf06d78	Fill in the blanks.	5	FITB
b0a44c50-d491-4b15-a962-dac92557b18c	4bfaf3ee-29e1-4590-be4e-e0877bf06d78	Select true/ false statement.	5	TF
ca16024e-8c5f-4d32-9cf0-cf7af9c301c9	4bfaf3ee-29e1-4590-be4e-e0877bf06d78	Match the following.	5	MATCH
f9da649a-cb73-448c-861b-85620427f101	bf2481e7-1814-4acb-9380-0bc2b0adb542	Multiple Choice Qustion 	5	MCQ
a4fdd9af-ee0b-4c58-92a7-4c0d7e34b02b	bf2481e7-1814-4acb-9380-0bc2b0adb542	Fill in the blanks	5	FITB
287aeec0-a9d5-4f6b-8a11-31138d8c4de0	bf2481e7-1814-4acb-9380-0bc2b0adb542	 True/ False  Questions	5	TF
3a486277-5dc0-4ef5-a268-000ff5b202da	bf2481e7-1814-4acb-9380-0bc2b0adb542	Match the following columns	5	MATCH
92bd4e49-feb3-4366-b703-70a26404b9be	5c50aa70-a328-47ab-ad2e-ef4ae40aaf63	Multiple Choice Questions (MCQ)	10	MCQ
741a8e4b-a562-4047-8b0e-5d840c1d503b	5c50aa70-a328-47ab-ad2e-ef4ae40aaf63	Fill in the Blanks	5	FITB
9db2a60b-11fd-4c71-9f58-56c313dac02a	5c50aa70-a328-47ab-ad2e-ef4ae40aaf63	State the True/False	5	TF
5ae09219-992a-49d9-93cd-cc56d4bc28c0	5c50aa70-a328-47ab-ad2e-ef4ae40aaf63	Left-Right Matching	5	MATCH
c7f73994-69af-4ecc-b13f-2d57e429dc75	74d5a0b0-7659-43cc-89f0-499b6751139f	Multiple Choice Questions (MCQs)	5	MCQ
904c5467-7423-4b7b-be80-6ff582882fa0	74d5a0b0-7659-43cc-89f0-499b6751139f	Fill in the Blanks	5	FITB
67bf1af3-5ec8-4cc4-9d63-fe353d6b41c0	74d5a0b0-7659-43cc-89f0-499b6751139f	True or False	5	TF
e46f4a66-a4fb-49bd-9275-d264106a429f	74d5a0b0-7659-43cc-89f0-499b6751139f	Left-Right Matching (Column A to Column B)	10	MATCH
\.


--
-- Data for Name: exam_sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.exam_sessions (session_id, exam_id, student_id, status, password_provided, tab_violation_count, seconds_left, last_active_timestamp, score) FROM stdin;
24e3503b-7eaf-42b8-89a5-7d9dba089600	4bfaf3ee-29e1-4590-be4e-e0877bf06d78	050	COMPLETED	SUNDHARAM@050	0	0	2026-07-04 04:06:14.675056	11.00
79a9a47f-3545-4875-ba0b-4f2b4324be39	4bfaf3ee-29e1-4590-be4e-e0877bf06d78	125	COMPLETED	RISHAB@125	0	0	2026-07-04 04:06:14.727609	15.00
2f602a81-b09b-4c20-bfad-72f83aba7e05	4bfaf3ee-29e1-4590-be4e-e0877bf06d78	062	COMPLETED	SHREYAN@062	0	0	2026-07-04 04:06:14.750926	18.00
03ab548e-ebf8-48db-9edd-f1488a56bc9d	4bfaf3ee-29e1-4590-be4e-e0877bf06d78	127	COMPLETED	ARIJIT@127	0	0	2026-07-04 04:06:14.711362	14.00
351eacd1-6321-4784-8841-870ab4c14af8	4bfaf3ee-29e1-4590-be4e-e0877bf06d78	037	COMPLETED	SAYANTIKA@037	0	0	2026-07-04 04:06:14.736375	17.00
33c74e71-28fb-453a-a774-36b74d602129	4bfaf3ee-29e1-4590-be4e-e0877bf06d78	055	COMPLETED	PRIYOM@055	0	0	2026-07-04 04:06:14.743209	16.00
ea82a606-80eb-485b-83b6-3d03c8d514ee	4bfaf3ee-29e1-4590-be4e-e0877bf06d78	052	COMPLETED	ISHAN@052	0	0	2026-07-04 04:06:14.720406	15.00
4344b05c-dda8-416d-bded-2516e9fa210c	5c50aa70-a328-47ab-ad2e-ef4ae40aaf63	057	COMPLETED	BIR@057	0	0	2026-07-09 10:50:50.434532	17.00
46a7e7a3-4f11-4d01-909b-1d0e06595da7	5c50aa70-a328-47ab-ad2e-ef4ae40aaf63	056	COMPLETED	SANDIP@056	0	0	2026-07-09 10:50:50.455799	20.00
8496b17b-6c20-49fe-8c07-fa91b30588b8	5c50aa70-a328-47ab-ad2e-ef4ae40aaf63	049	COMPLETED	TAMOJIT@049	0	0	2026-07-09 10:50:50.461375	24.00
0ad9048b-f36f-4569-9c69-477db25385f4	5c50aa70-a328-47ab-ad2e-ef4ae40aaf63	061	COMPLETED	ANIRUDRA@061	0	0	2026-07-09 10:50:50.485119	23.00
d756ce60-c4ab-4b4c-a680-003d1497e4a1	5c50aa70-a328-47ab-ad2e-ef4ae40aaf63	040	COMPLETED	ANKIT@040	0	0	2026-07-09 10:50:50.471327	23.00
9e2f8337-9cd8-4506-b4d0-fc622fe06ca7	5c50aa70-a328-47ab-ad2e-ef4ae40aaf63	041	COMPLETED	SAMIRAN@041	0	0	2026-07-09 10:50:50.476355	17.00
986ed183-9244-4b47-a0e7-b5260db0faec	5c50aa70-a328-47ab-ad2e-ef4ae40aaf63	066	COMPLETED	DIYA@066	0	0	2026-07-09 10:50:50.492139	22.00
00a7405d-ab37-4399-a40b-7f6b3158de74	bf2481e7-1814-4acb-9380-0bc2b0adb542	140	COMPLETED	AYUSH@140	0	0	2026-07-06 10:46:24.843916	9.00
20ad5f99-4429-4196-834b-e166ac9ea560	bf2481e7-1814-4acb-9380-0bc2b0adb542	128	COMPLETED	RAJ@128	0	0	2026-07-06 10:46:24.734115	11.00
159182f4-ff10-497c-b0ce-c3adc8d012e0	bf2481e7-1814-4acb-9380-0bc2b0adb542	060	COMPLETED	SAMADHAN@060	0	0	2026-07-06 10:46:24.791141	12.00
c7ca48e1-e77c-430f-8c24-9d2b49437647	bf2481e7-1814-4acb-9380-0bc2b0adb542	124	COMPLETED	ASHIS@124	0	0	2026-07-06 10:46:24.813701	13.00
5bedcf2b-c92f-429d-95d2-c316ee256fd1	bf2481e7-1814-4acb-9380-0bc2b0adb542	065	COMPLETED	SAYAN@065	0	0	2026-07-06 10:46:24.797525	19.00
9931b37f-2ae5-4db9-9bac-ecbb8079627d	bf2481e7-1814-4acb-9380-0bc2b0adb542	068	COMPLETED	ARGHA@068	0	0	2026-07-06 10:46:24.758762	18.00
ca997e9b-acdb-423c-a008-b5faeb24d6f5	bf2481e7-1814-4acb-9380-0bc2b0adb542	141	COMPLETED	NILAY@141	0	0	2026-07-06 10:46:24.835123	8.00
a6c77b0d-2939-4b6b-af4a-32e1c592d903	5c50aa70-a328-47ab-ad2e-ef4ae40aaf63	123	COMPLETED	SUHARTA@123	0	0	2026-07-09 10:50:50.51236	18.00
2e568f7d-b4d1-4ff1-bdec-f67ea61c70bb	5c50aa70-a328-47ab-ad2e-ef4ae40aaf63	138	COMPLETED	DIYA@138	0	0	2026-07-09 10:50:50.521201	14.00
722cf1a8-1f40-40e8-9092-54139aa2640d	5c50aa70-a328-47ab-ad2e-ef4ae40aaf63	073	COMPLETED	DHRUB@073	0	0	2026-07-09 10:50:50.500452	19.00
fd91991a-2f5c-4a8d-b12d-f183d6f7925e	5c50aa70-a328-47ab-ad2e-ef4ae40aaf63	113	COMPLETED	RIMAN@113	0	0	2026-07-09 10:50:50.507464	21.00
a1c4bc64-ccc9-4883-8ca7-d4443a873d54	5c50aa70-a328-47ab-ad2e-ef4ae40aaf63	145	COMPLETED	RITTIKA@145	1	0	2026-07-09 10:50:50.52597	17.00
65d884ae-716e-49c1-8121-58f69a917807	bf2481e7-1814-4acb-9380-0bc2b0adb542	091	COMPLETED	ADITRI@091	0	0	2026-07-06 10:46:24.806344	15.00
1f1931b8-3d5b-4428-b0f4-d5e30d18bfdb	bf2481e7-1814-4acb-9380-0bc2b0adb542	071	COMPLETED	SHRIJIB@071	0	0	2026-07-06 10:46:24.765779	19.00
90622fdf-3569-4585-a4ff-4cba93424d68	bf2481e7-1814-4acb-9380-0bc2b0adb542	106	COMPLETED	RUDRANIL@106	0	0	2026-07-06 10:46:24.82906	12.00
f4538af3-2ee8-4aa9-b702-2513ce0274f0	bf2481e7-1814-4acb-9380-0bc2b0adb542	069	COMPLETED	TRISHAN@069	0	0	2026-07-06 10:46:24.822695	18.00
6cdb6697-0cc1-424b-a861-88722168dc54	bf2481e7-1814-4acb-9380-0bc2b0adb542	067	COMPLETED	ARITRA@067	0	0	2026-07-06 10:46:24.780873	20.00
6522602f-343d-4545-b3b6-64fefe44f3a0	bf2481e7-1814-4acb-9380-0bc2b0adb542	090	COMPLETED	CHINMOYEE@090	0	0	2026-07-06 10:46:24.774085	17.00
7c6bc8a4-376a-4405-b0ab-fd312b3b728d	74d5a0b0-7659-43cc-89f0-499b6751139f	133	COMPLETED	PROGYA@133	0	0	2026-07-19 03:53:15.945809	12.00
491e4671-6588-41ad-8fa8-f8073fd66d6d	74d5a0b0-7659-43cc-89f0-499b6751139f	119	COMPLETED	TULIKA@119	0	0	2026-07-19 03:53:15.9216	19.00
da260c91-075f-4b69-9e4f-21e38e225b15	74d5a0b0-7659-43cc-89f0-499b6751139f	130	COMPLETED	ISHIKA@130	0	0	2026-07-19 03:53:15.897688	17.00
df9b93cc-bd96-4fc8-b2b0-641df6dcb1d9	74d5a0b0-7659-43cc-89f0-499b6751139f	039	COMPLETED	RIHAN@039	0	0	2026-07-19 03:53:15.833423	17.00
1e3c7aa0-9622-4a4f-8b95-ab0c60c0453b	4bfaf3ee-29e1-4590-be4e-e0877bf06d78	129	COMPLETED	ARGO@129	0	0	2026-07-04 04:06:14.768233	16.00
bdc82668-ec39-40f9-8555-42449cd34740	4bfaf3ee-29e1-4590-be4e-e0877bf06d78	142	COMPLETED	DEVRAJ@142	0	0	2026-07-04 04:06:14.775127	12.00
dc9f7a74-b535-407f-8da2-0b9290b88dbb	4bfaf3ee-29e1-4590-be4e-e0877bf06d78	063	COMPLETED	ARNAB@063	0	0	2026-07-04 04:06:14.758953	8.00
\.


--
-- Data for Name: exams; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.exams (exam_id, title, duration_minutes, target_batch, full_marks, status, scheduled_start, actual_start_time, actual_end_time, global_seconds_left) FROM stdin;
74d5a0b0-7659-43cc-89f0-499b6751139f	TERM 1: Computer Studies	50	KIDS III, IV, V	25	ENDED	\N	2026-07-19 03:55:53.226273	2026-07-19 04:28:11.50805	1065
5c50aa70-a328-47ab-ad2e-ef4ae40aaf63	Term 2: MS Excel Basics	40	VII,VIII,IX Batch 2	25	ENDED	\N	2026-07-09 11:45:01.751832	2026-07-09 12:14:14.755705	650
4bfaf3ee-29e1-4590-be4e-e0877bf06d78	TERM 2: MS Word, MS PowerPoint	40	V,VI Batch 1	20	ENDED	\N	2026-07-04 04:14:13.601244	2026-07-04 04:54:16.204878	0
bf2481e7-1814-4acb-9380-0bc2b0adb542	TERM 2: MS Word, MS PowerPoint	40	V,VI,VII Batch -2	20	ENDED	\N	2026-07-06 10:53:23.128731	2026-07-07 06:08:00.68289	1800
\.


--
-- Data for Name: questions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.questions (question_id, exam_id, section_id, question_type, question_text_en, question_text_bn, options_json, correct_answer, marks) FROM stdin;
4f104b3d-45ff-42ff-b35f-81cce60262d6	bf2481e7-1814-4acb-9380-0bc2b0adb542	a4fdd9af-ee0b-4c58-92a7-4c0d7e34b02b	FITB	The normal mouse pointer is called ____.	সাধারণ মাউস পয়েন্টারকে ____ বলে।	[{"id": "opt_aca4c601", "text": "Arrow/অ্যারো"}]	["opt_aca4c601"]	1
5833849f-e021-4927-bace-bc24f886f3e3	5c50aa70-a328-47ab-ad2e-ef4ae40aaf63	92bd4e49-feb3-4366-b703-70a26404b9be	MCQ	What will the formula =LEFT("INDIA", 4) return?	=LEFT("INDIA", 4) ফর্মুলাটি কী রেজাল্ট দেবে?	["NDIA", "INDI", "IND", "DIA"]	INDI	1
1dad6cea-4651-41a2-b39f-a893ceb4a6c5	4bfaf3ee-29e1-4590-be4e-e0877bf06d78	b0a44c50-d491-4b15-a962-dac92557b18c	TF	The key shortcut Ctrl + I is used to make selected text look tilted to add emphasis. 	নির্বাচিত টেক্সটকে তির্যক (tilted) দেখাতে এবং জোর (emphasis) প্রদান করতে Ctrl + I শর্টকাটটি ব্যবহৃত হয়।	[{"id": "opt_true", "text": "True"}, {"id": "opt_false", "text": "False"}]	opt_true	1
9d998d8c-06e6-47f0-8b3a-1a594cb2e461	4bfaf3ee-29e1-4590-be4e-e0877bf06d78	27fd18b7-2b5b-4284-9e6b-883a1199238f	FITB	The shortcut combination used to instantly Paste a copied segment of text into a new location is __________.	কপি করা কোনো লেখা নতুন কোনো জায়গায় তৎক্ষণাৎ বসানোর (Paste করার) শর্টকাট কম্বিনেশন হলো __________।	[{"id": "opt_b66d09b7", "text": "Ctrl + V"}, {"id": "opt_3817be67", "text": "Ctrl + D"}]	["opt_b66d09b7"]	1
4d0d14e5-43cd-4fa4-a710-201e5b235813	4bfaf3ee-29e1-4590-be4e-e0877bf06d78	b0a44c50-d491-4b15-a962-dac92557b18c	TF	A Word Processor is primarily used to edit, format, and print text documents rather than executing heavy financial data calculations.	ভারী আর্থিক ডেটা গণনার পরিবর্তে একটি ওয়ার্ড প্রসেসর প্রাথমিকভাবে পাঠ্য নথিগুলি সম্পাদনা, বিন্যাস এবং মুদ্রণের জন্য ব্যবহৃত হয়।	[{"id": "opt_true", "text": "True"}, {"id": "opt_false", "text": "False"}]	opt_true	1
8e0f9d97-1212-4bbe-aed7-cbf933820324	bf2481e7-1814-4acb-9380-0bc2b0adb542	a4fdd9af-ee0b-4c58-92a7-4c0d7e34b02b	FITB	____ was the creator of MS Word.	____ হলেন MS Word-এর নির্মাতা।	[{"id": "opt_70235033", "text": "Charles Simonyi and Richard Brodie/রিচার্ড ব্রোডি এবং চার্লস সিমোনি"}]	["opt_70235033"]	1
5a52b49e-c2c0-40ba-b111-f52c6dd3214a	bf2481e7-1814-4acb-9380-0bc2b0adb542	287aeec0-a9d5-4f6b-8a11-31138d8c4de0	TF	Word is a Word Processor.	Word একটি Word Processor।	[{"id": "opt_true", "text": "True"}, {"id": "opt_false", "text": "False"}]	opt_true	1
74986336-9e63-400a-b22e-dae356d05bd1	4bfaf3ee-29e1-4590-be4e-e0877bf06d78	27fd18b7-2b5b-4284-9e6b-883a1199238f	FITB	The tool inside the Paragraph group that flushes your lines evenly along both the left and right margins, like a professional school textbook, is called __________ Alignment.	প্যারাগ্রাফ গ্রুপের অন্তর্গত যে টুলটি লেখার দুই পাশের মার্জিন সমান করে সাজায় (যেমন পাঠ্যবইয়ে থাকে), তাকে __________ অ্যালাইনমেন্ট বলা হয়।	[{"id": "opt_7e516a26", "text": "Justify"}, {"id": "opt_ceb17261", "text": "Left"}]	["opt_7e516a26"]	1
5e369759-589c-4539-976e-d21c6dadfe26	4bfaf3ee-29e1-4590-be4e-e0877bf06d78	27fd18b7-2b5b-4284-9e6b-883a1199238f	FITB	Shreya accidentally dragged an image behind a solid colored background shape. She can bring the hidden image back to the top visible layer using the __________ command under the Arrange tool settings.	শ্রেয়া ভুলবশত একটি রঙিন ব্যাকগ্রাউন্ড শেপের পেছনে একটি ছবি ড্র্যাগ করে ফেলেছে। সে অ্যারেঞ্জ টুল সেটিংসের অধীনে থাকা __________ কমান্ডটি ব্যবহার করে লুকানো ছবিটিকে সবার সামনের স্তরে ফিরিয়ে আনতে পারবে।\n	[{"id": "opt_dab3ef29", "text": "bring to Front (or Bring Forward)"}]	["opt_dab3ef29"]	1
f102540d-9197-4ff0-9c4b-9605054a0a15	4bfaf3ee-29e1-4590-be4e-e0877bf06d78	27fd18b7-2b5b-4284-9e6b-883a1199238f	FITB	 To instantly change the overall style, background colors, and font styles across all your slides, you should apply a professional built-in Design __________. 	 তোমার সবকটি স্লাইডের সামগ্রিক স্টাইল, ব্যাকগ্রাউন্ড কালার এবং ফন্ট একবারে পরিবর্তন করার জন্য একটি বিল্ট-ইন ডিজাইন __________ অ্যাপ্লাই করা উচিত।	[{"id": "opt_86560393", "text": "Theme (or Template)"}]	["opt_86560393"]	1
3e1e7a5b-af98-4fa4-bdb0-fd80fd61c863	4bfaf3ee-29e1-4590-be4e-e0877bf06d78	27fd18b7-2b5b-4284-9e6b-883a1199238f	FITB	Microsoft PowerPoint, Google Slides, and Apple Keynote are all examples of electronic __________ software. 	মাইক্রোসফট পাওয়ারপয়েন্ট, গুগল স্লাইডস এবং অ্যাপল কিনোট—এগুলি সবই ইলেকট্রনিক __________ সফটওয়্যারের উদাহরণ।   \n\n	[{"id": "opt_e74451e6", "text": "Presentation"}]	["opt_e74451e6"]	1
47afac17-2732-4645-9833-725035b5f0ee	4bfaf3ee-29e1-4590-be4e-e0877bf06d78	433151b7-01c4-4900-a99d-8feb3e72891d	MCQ	Which shortcut is used to combine keys to Underline a specific word or sentence?	কোনো নির্দিষ্ট শব্দ বা বাক্যের নিচে দাগ দেওয়ার (Underline করার) জন্য কোন শর্টকাটটি ব্যবহার করা হয়? \n \n	[{"id": "opt_ea944f24", "text": " (A) Ctrl + I "}, {"id": "opt_dd1961a9", "text": "(B) Ctrl + U"}, {"id": "opt_542dfc08", "text": "(C) Ctrl + Z "}, {"id": "opt_421e5bbb", "text": "(D) Ctrl + C"}]	opt_dd1961a9	1
3013f8bc-c2e6-4e86-a2df-a624c36feac7	bf2481e7-1814-4acb-9380-0bc2b0adb542	f9da649a-cb73-448c-861b-85620427f101	MCQ	Which alignment places text on the left side?	লেখাকে বাম পাশে আনতে কোন Alignment ব্যবহার করা হয়?	[{"id": "opt_ad5dffad", "text": "Center/মাঝখানে "}, {"id": "opt_9a8bc4bb", "text": "Right/ডান পাশে"}, {"id": "opt_80a33b3c", "text": "Left/বাম পাশে"}, {"id": "opt_4c703f2f", "text": " Justify/সমানভাবে"}]	opt_80a33b3c	1
5e820249-1a2a-4819-b3dd-9dc58fcabf5a	4bfaf3ee-29e1-4590-be4e-e0877bf06d78	433151b7-01c4-4900-a99d-8feb3e72891d	MCQ	What state does the spinning circle or hourglass mouse pointer indicate to a computer user? 	স্ক্রিনে গোল চাকা (স্পিনিং সার্কেল) বা বালিঘড়ি আকৃতির মাউস পয়েন্টার ব্যবহারকারীকে কম্পিউটারের কোন অবস্থা নির্দেশ করে? 	[{"id": "opt_5d39aa01", "text": "Ready for Select/ নির্বাচনের জন্য প্রস্তুত  "}, {"id": "opt_a2ab500f", "text": "Computer is Busy or thinking/ কম্পিউটার ব্যস্ত বা কাজ করছে"}, {"id": "opt_97ba560e", "text": "Text Editing Mode/ টেক্সট এডিটিং মোড          "}, {"id": "opt_8a468396", "text": "No Connection/ কোনো সংযোগ নেই"}]	opt_a2ab500f	1
8a269244-5de5-44b9-9728-22c58610f44c	4bfaf3ee-29e1-4590-be4e-e0877bf06d78	433151b7-01c4-4900-a99d-8feb3e72891d	MCQ	You notice a small arrow icon sitting directly at the bottom-right corner of a command group (like Font or Paragraph) on the ribbon interface. What is this launcher arrow called? 	রিবন ইন্টারফেসে কোনো কম্যান্ড গ্রুপের (যেমন ফন্ট বা প্যারাগ্রাফ) নিচের ডানদিকের কোণায় একটি ছোট তীর চিহ্ন দেখা যায়। এই লঞ্চার তীরটিকে কী বলা হয়?	[{"id": "opt_152a5349", "text": "Magic Arrow / ম্যাজিক অ্যারো"}, {"id": "opt_c08b22c5", "text": "Dialog Box Launcher/) ডায়ালগ বক্স লঞ্চার"}, {"id": "opt_6f13c03b", "text": " Dropdown Format/ ড্রপডাউন ফরম্যাট "}, {"id": "opt_b0f85ea7", "text": "Ribbon Closer/) রিবন ক্লোজার"}]	opt_c08b22c5	1
6cae5623-95c1-464c-be0b-56ebfa95c90e	4bfaf3ee-29e1-4590-be4e-e0877bf06d78	b0a44c50-d491-4b15-a962-dac92557b18c	TF	Center alignment aligns the left edge of your text with the left margin while leaving the right edge ragged. 	 সেন্টার অ্যালাইনমেন্ট (Center alignment) লেখার বাম প্রান্তকে বাম মার্জিনের সাথে সমানভাবে সারিবদ্ধ করে এবং ডান প্রান্তকে এলোমেলো রাখে।	[{"id": "opt_true", "text": "True"}, {"id": "opt_false", "text": "False"}]	opt_false	1
285d42fa-6f44-4124-b723-91d1d8f5331a	4bfaf3ee-29e1-4590-be4e-e0877bf06d78	b0a44c50-d491-4b15-a962-dac92557b18c	TF	Object Animations control the way how entire slide pages change one after another onto the display screen.	অবজেক্ট অ্যানিমেশন (Object Animations) নিয়ন্ত্রণ করে কীভাবে সম্পূর্ণ স্লাইড পৃষ্ঠাগুলি একের পর এক স্ক্রিনে পরিবর্তিত হবে।	[{"id": "opt_true", "text": "True"}, {"id": "opt_false", "text": "False"}]	opt_false	1
2bc66a81-be3a-455a-b276-dcea37c3f786	4bfaf3ee-29e1-4590-be4e-e0877bf06d78	b0a44c50-d491-4b15-a962-dac92557b18c	TF	PowerPoint was originally developed by Microsoft from scratch in its own tech lab labs before launch.	পাওয়ারপয়েন্ট সফটওয়্যারটি বাজারে আসার আগে প্রথম থেকেই মাইক্রোসফট কোম্পানি তাদের নিজস্ব টেক ল্যাবে সম্পূর্ণ নতুনভাবে তৈরি করেছিল। 	[{"id": "opt_true", "text": "True"}, {"id": "opt_false", "text": "False"}]	opt_false	1
9f9846dc-5b05-4ee3-a8d0-0360d8552ada	4bfaf3ee-29e1-4590-be4e-e0877bf06d78	ca16024e-8c5f-4d32-9cf0-cf7af9c301c9	MATCH	Match the following.	বাম-ডান মেলানো	{"left": [{"id": "opt_e6b50d01", "text": "Copy / কপি"}, {"id": "opt_d9ebff3d", "text": "Word Processor / ওয়ার্ড প্রসেসর"}, {"id": "opt_c23b289b", "text": "Paste / পেস্ট"}, {"id": "opt_f190cefa", "text": "Presentation / প্রেজেন্টেশন"}, {"id": "opt_ebf395ae", "text": "Arrow / অ্যারো"}], "right": [{"id": "opt_e5816d34", "text": "MS Word / এমএস ওয়ার্ড"}, {"id": "opt_2f50a64b", "text": "PowerPoint / পাওয়ারপয়েন্ট"}, {"id": "opt_3b71d0c0", "text": "Normal Select / সাধারণ নির্বাচন"}, {"id": "opt_ac59de90", "text": "Ctrl C"}, {"id": "opt_1fb2aa55", "text": "Ctrl V"}]}	{"opt_d9ebff3d":"opt_e5816d34","opt_f190cefa":"opt_2f50a64b","opt_e6b50d01":"opt_ac59de90","opt_ebf395ae":"opt_3b71d0c0","opt_c23b289b":"opt_1fb2aa55"}	5
4e903aae-4a32-4aaf-9c04-d3afd67dd3ff	4bfaf3ee-29e1-4590-be4e-e0877bf06d78	433151b7-01c4-4900-a99d-8feb3e72891d	MCQ	While formatting text on a presentation slide, which dedicated tool adds a subtle 3D shadow depth effect directly behind your selected letters? 	একটি প্রেজেন্টেশন স্লাইডে টেক্সট ফরম্যাট করার সময়, কোন নির্দিষ্ট টুলটি আপনার নির্বাচিত অক্ষরের ঠিক পিছনে একটি সূক্ষ্ম থ্রিডি শ্যাডো ডেপথ ইফেক্ট যোগ করে?	[{"id": "opt_4f843fa4", "text": "Text Shadow / টেক্সট শ্যাডো"}, {"id": "opt_52fac964", "text": "Character Spacing/ ক্যারেক্টার স্পেসিং"}, {"id": "opt_9f2fee31", "text": "Bold Variant / বোল্ড ভ্যারিয়েন্ট"}, {"id": "opt_1bacd7f8", "text": "WordArt Transform/ ওয়ার্ডআর্ট ট্রান্সফর্ম"}]	opt_4f843fa4	1
81adce44-5a09-4c64-960f-6d88e1f9ce8a	bf2481e7-1814-4acb-9380-0bc2b0adb542	a4fdd9af-ee0b-4c58-92a7-4c0d7e34b02b	FITB	4. MS Word is a ____.\n	MS Word একটি ____।\n	[{"id": "opt_c8df9d8b", "text": "Word Processor/ওয়ার্ড প্রসেসর"}, {"id": "opt_b9465172", "text": "Web Browser/ওয়েব ব্রাউজার"}]	["opt_c8df9d8b"]	1
6ca03b34-58b6-4ff3-95f7-67b0a116d6b5	bf2481e7-1814-4acb-9380-0bc2b0adb542	a4fdd9af-ee0b-4c58-92a7-4c0d7e34b02b	FITB	PowerPoint is used to create ____	PowerPoint ব্যবহার করে ____ তৈরি করা হয়।	[{"id": "opt_8a9b7c71", "text": "Presentations/প্রেজেন্টেশন"}, {"id": "opt_190c3aa0", "text": "Videos/ ভিডিও"}]	["opt_8a9b7c71"]	1
f44e2f83-0626-48a5-8e9e-f62275146c71	bf2481e7-1814-4acb-9380-0bc2b0adb542	287aeec0-a9d5-4f6b-8a11-31138d8c4de0	TF	Copy removes the selected text.	Copy নির্বাচিত লেখা মুছে দেয়। \n\n	[{"id": "opt_true", "text": "True"}, {"id": "opt_false", "text": "False"}]	opt_false	1
5b927fd8-6faf-4e58-b885-e0bb11bfcab0	bf2481e7-1814-4acb-9380-0bc2b0adb542	f9da649a-cb73-448c-861b-85620427f101	MCQ	Which option is used to add a new slide?\n	নতুন Slide যোগ করতে কোন Option ব্যবহার করা হয়?\n	[{"id": "opt_fc91ed25", "text": "New Slide/নতুন স্লাইড"}, {"id": "opt_13c5c451", "text": "New Page/নতুন পৃষ্ঠা"}, {"id": "opt_d340e96e", "text": " New File/ নতুন ফাইল"}, {"id": "opt_bb2a2955", "text": " New Theme/নতুন থিম"}]	opt_fc91ed25	1
607358c1-d40b-4898-9fa2-be00b1f416f6	bf2481e7-1814-4acb-9380-0bc2b0adb542	287aeec0-a9d5-4f6b-8a11-31138d8c4de0	TF	PowerPoint is used to create presentations.	PowerPoint ব্যবহার করে Presentation তৈরি করা হয়।\n	[{"id": "opt_true", "text": "True"}, {"id": "opt_false", "text": "False"}]	opt_true	1
87f762be-3f3b-44f8-bb67-c15feea21677	bf2481e7-1814-4acb-9380-0bc2b0adb542	287aeec0-a9d5-4f6b-8a11-31138d8c4de0	TF	The Design tab is used to insert pictures only.	Tab শুধুমাত্র Picture যোগ করার জন্য ব্যবহৃত হয়।	[{"id": "opt_true", "text": "True"}, {"id": "opt_false", "text": "False"}]	opt_false	1
a4ac9d05-a71d-425e-93e9-48280eb0424d	bf2481e7-1814-4acb-9380-0bc2b0adb542	287aeec0-a9d5-4f6b-8a11-31138d8c4de0	TF	Format Painter is used to copy formatting. 	Format Painter লেখার Format কপি করতে ব্যবহৃত হয়।	[{"id": "opt_true", "text": "True"}, {"id": "opt_false", "text": "False"}]	opt_true	1
2854a144-028b-40ce-8643-2e5d848fe940	bf2481e7-1814-4acb-9380-0bc2b0adb542	a4fdd9af-ee0b-4c58-92a7-4c0d7e34b02b	FITB	Rehearse Timings is available in the ____ tab.	Rehearse Timings ____ ট্যাবে থাকে।	[{"id": "opt_4bd39374", "text": "Slide Show/স্লাইড শো"}]	["opt_4bd39374"]	1
1da1d0d6-5896-4e7f-9ae8-ddb8c2c8e172	bf2481e7-1814-4acb-9380-0bc2b0adb542	3a486277-5dc0-4ef5-a268-000ff5b202da	MATCH	Match From Left to Right	বাম থেকে ডানে মেলান	{"left": [{"id": "opt_b5dca964", "text": "Transition/ ⁠ট্রানজিশন"}, {"id": "opt_f18a4d42", "text": "Slide Show/⁠স্লাইড শো"}, {"id": "opt_9ae5d99f", "text": "Layout Tab/ ⁠লেআউট ট্যাব"}, {"id": "opt_e7c6a6da", "text": "Arrow Pointe/⁠অ্যারো পয়েন্টার"}, {"id": "opt_d8f8b832", "text": "Copy/ কপি"}], "right": [{"id": "opt_6286bbd1", "text": "Changes page margins/পেজ মার্জিন পরিবর্তন করে"}, {"id": "opt_054912bb", "text": "Copies selected text/ নির্বাচিত লেখা কপি করে"}, {"id": "opt_df36da1a", "text": "Normal mouse pointer/সাধারণ মাউস পয়েন্টার"}, {"id": "opt_0cd91b32", "text": "Starts presentation/প্রেজেন্টেশন শুরু করে"}, {"id": "opt_bfb9d3c2", "text": "Effect between slides/দুটি স্লাইডের মধ্যবর্তী ইফেক্ট"}]}	{"opt_d8f8b832":"opt_054912bb","opt_9ae5d99f":"opt_6286bbd1","opt_f18a4d42":"opt_0cd91b32","opt_e7c6a6da":"opt_df36da1a","opt_b5dca964":"opt_bfb9d3c2"}	5
2cd0fb2f-f3fc-409d-ac74-1d4e2acfc219	4bfaf3ee-29e1-4590-be4e-e0877bf06d78	433151b7-01c4-4900-a99d-8feb3e72891d	MCQ	Which shortcut key lets you add a Duplicate Slide or quickly clone a shape inside a presentation software? 	প্রেজেন্টেশন সফটওয়্যারে একটি ডুপ্লিকেট স্লাইড যোগ করতে বা কোনো শেপকে দ্রুত ক্লোন করতে কোন শর্টকাট কী সাহায্য করে? 	[{"id": "opt_3136d73c", "text": "Ctrl + M "}, {"id": "opt_922d156f", "text": "Ctrl + N"}, {"id": "opt_f159b4ff", "text": "Ctrl + D "}, {"id": "opt_f299055c", "text": "Ctrl + K"}]	opt_f159b4ff	1
57c88058-5210-4ed2-bb40-e9ff09415a34	bf2481e7-1814-4acb-9380-0bc2b0adb542	f9da649a-cb73-448c-861b-85620427f101	MCQ	Which tab is used to insert a picture?	ছবি (Picture) যোগ করতে কোন ট্যাব ব্যবহার করা হয়?	[{"id": "opt_ce19a47e", "text": "Home/হোম"}, {"id": "opt_d870fc2d", "text": "Insert/ইনসার্ট "}, {"id": "opt_0afdee06", "text": " Design/ডিজাইন"}, {"id": "opt_a16fd6d6", "text": "Layout/লেআউট"}]	opt_d870fc2d	1
a6c19706-467e-466b-ad72-c49fa7f225bc	bf2481e7-1814-4acb-9380-0bc2b0adb542	f9da649a-cb73-448c-861b-85620427f101	MCQ	Which tab contains the Font group?	ফন্ট (Font) গ্রুপ কোন ট্যাবে থাকে?\n	[{"id": "opt_46249571", "text": " Home/হোম"}, {"id": "opt_364577e8", "text": "Insert/ইনসার্ট"}, {"id": "opt_2858e331", "text": " Design/ডিজাইন"}, {"id": "opt_9f2d381e", "text": "Layout/লেআউট"}]	opt_46249571	1
b3b7d896-b817-4b0d-8785-aac5d84ef0ba	bf2481e7-1814-4acb-9380-0bc2b0adb542	f9da649a-cb73-448c-861b-85620427f101	MCQ	What is a transition?	Transition কী?	[{"id": "opt_ab512a31", "text": " Slide changing effect/স্লাইড পরিবর্তনের প্রভাব"}, {"id": "opt_b6999fdf", "text": " Font style/ফন্টের ধরন"}, {"id": "opt_518163b3", "text": "Picture /ছবি"}, {"id": "opt_819a94ff", "text": "Table/টেবিল"}]	opt_ab512a31	1
0fde9b9b-a7dc-4c9d-96c4-6c48a135e0bb	5c50aa70-a328-47ab-ad2e-ef4ae40aaf63	92bd4e49-feb3-4366-b703-70a26404b9be	MCQ	The horizontal lines in an Excel sheet are called what?	এক্সেল শিটের আড়াআড়ি লাইনগুলোকে কী বলে?	["Column", "Row", "Cell", "Sheet"]	Row	1
c2b4b7f2-9fb8-4d30-b9de-017d8c5ba2de	5c50aa70-a328-47ab-ad2e-ef4ae40aaf63	92bd4e49-feb3-4366-b703-70a26404b9be	MCQ	The COUNT function counts selected cells that contain only what?	COUNT ফাংশন সেলের কোন জিনিসটি গোনে?	["Text", "Colors", "Numbers", "Formulas"]	Numbers	1
0d0c87e5-95d3-4154-9064-f4d790dd2983	5c50aa70-a328-47ab-ad2e-ef4ae40aaf63	741a8e4b-a562-4047-8b0e-5d840c1d503b	FITB	The vertical lines in an Excel worksheet are called ________.	এক্সেল শিটের লম্বালম্বি লাইনগুলোকে ________ বলা হয়।	["Column / কলাম", "Row / সারি"]	["Column / কলাম"]	1
6a765bb1-0292-46c6-8709-ecf5e9f99626	5c50aa70-a328-47ab-ad2e-ef4ae40aaf63	741a8e4b-a562-4047-8b0e-5d840c1d503b	FITB	Writing =10+20 instead of using cell references is an example of ________ numbers.	ফর্মুলায় সেল রেফারেন্সের বদলে সরাসরি =10+20 লেখা হলো ________ নাম্বারের উদাহরণ।	["Hardcoded / হার্ডকোডেড"]	["Hardcoded / হার্ডকোডেড"]	1
f8f69dee-87eb-46b3-b6f4-c38ff0faf1c5	5c50aa70-a328-47ab-ad2e-ef4ae40aaf63	741a8e4b-a562-4047-8b0e-5d840c1d503b	FITB	The long box right above the worksheet where cell formulas appear is the ________.	ওয়ার্কশিটের ঠিক উপরে থাকা লম্বা বক্সটিকে ________ বলে।	["Formula Bar / ফর্মুলা বার", "Bar / বার"]	["Formula Bar / ফর্মুলা বার"]	1
c67a6153-b9e3-4518-9992-6e882273f597	5c50aa70-a328-47ab-ad2e-ef4ae40aaf63	741a8e4b-a562-4047-8b0e-5d840c1d503b	FITB	To add numbers together based on a specific condition, we use the ________ function.	নির্দিষ্ট কোনো শর্ত বা ক্রাইটেরিয়া মিলিয়ে যোগ করার জন্য ________ ফাংশন ব্যবহার করা হয়।	["SUMIF", "IF"]	["SUMIF"]	1
13a091e7-a5e6-405c-a48c-c4129bc683d3	5c50aa70-a328-47ab-ad2e-ef4ae40aaf63	92bd4e49-feb3-4366-b703-70a26404b9be	MCQ	Every Excel formula must start with which sign?	এক্সেলে যেকোনো ফর্মুলা শুরু করার সময় কোন চিহ্ন দিতে হয়?	["=", "+", "-", "*"]	=	1
029fc3b0-9c48-4fbb-9677-af33e7277f18	5c50aa70-a328-47ab-ad2e-ef4ae40aaf63	92bd4e49-feb3-4366-b703-70a26404b9be	MCQ	Which function finds the largest number within selected cells?	সবচেয়ে বড় সংখ্যাটি খুঁজে বের করার ফর্মুলা কী?	["LARGE", "MIN", "MAX", "MAXI"]	MAX	1
35dff853-36c5-4f24-b54a-f49f2c1322f9	5c50aa70-a328-47ab-ad2e-ef4ae40aaf63	92bd4e49-feb3-4366-b703-70a26404b9be	MCQ	Which Auto Fill option copies only the cell's background color or design?	কোন অপশনের মাধ্যমে শুধুমাত্র সেলের ডিজাইন বা রং কপি করা যায়?	["Auto Fill", "Fill Series", "Copy Cells", "Fill Formatting Only"]	Fill Formatting Only	1
298955cb-e6db-47fc-9cab-eed36da79791	5c50aa70-a328-47ab-ad2e-ef4ae40aaf63	92bd4e49-feb3-4366-b703-70a26404b9be	MCQ	Which function performs a logical test to show "Pass" or "Fail"?	লজিক্যাল টেস্ট করে Pass/Fail দেখানোর জন্য কোন ফাংশন ব্যবহার করা হয়?	["SUMIF", "IF", "COUNT", "AVERAGE"]	IF	1
470e201b-9ddc-4738-a700-f8147ddb2a49	5c50aa70-a328-47ab-ad2e-ef4ae40aaf63	92bd4e49-feb3-4366-b703-70a26404b9be	MCQ	The intersection of a Row and Column is called a?	Row এবং Column-এর মিলনস্থলকে বা ছোট ঘরগুলোকে কী বলে?	["Cell", "Box", "Table", "Grid"]	Cell	1
ec445dac-554e-42f1-9f2b-56e66908bbe3	5c50aa70-a328-47ab-ad2e-ef4ae40aaf63	92bd4e49-feb3-4366-b703-70a26404b9be	MCQ	Which formula returns the current date and time?	বর্তমান তারিখ এবং সময় একসাথে দেখানোর ফর্মুলা কোনটি?	["TIME", "TODAY", "NOW", "DATE"]	NOW	1
ece85ffd-57f4-462f-955c-f314b9c7ea3c	5c50aa70-a328-47ab-ad2e-ef4ae40aaf63	92bd4e49-feb3-4366-b703-70a26404b9be	MCQ	Which function extracts characters from the middle of a text string?	কোনো টেক্সটের মাঝখান থেকে নির্দিষ্ট অক্ষর বের করার ফাংশন কোনটি?	["MID", "CENTER", "MIDDLE", "BETWEEN"]	MID	1
529ae2ad-c7dd-483c-be8d-449d7ddab0c9	5c50aa70-a328-47ab-ad2e-ef4ae40aaf63	741a8e4b-a562-4047-8b0e-5d840c1d503b	FITB	The small square dot at the bottom-right corner of a selected cell is known as the ________ Handle.	সিলেক্ট করা সেলের একদম নিচে ডানদিকের ছোট চারকোনা বিন্দুটিকে ________ বলে।	["Auto Fill / অটো ফিল"]	["Auto Fill / অটো ফিল"]	1
49e74ece-1bf8-4ba7-9e7a-423160814df2	5c50aa70-a328-47ab-ad2e-ef4ae40aaf63	9db2a60b-11fd-4c71-9f58-56c313dac02a	TF	If you don't put an "=" sign at the beginning, Excel treats the formula as normal text.	ফর্মুলার আগে সমান (=) চিহ্ন না দিলে এক্সেল ওটাকে সাধারণ টেক্সট হিসেবে ধরে নেয়।	["True", "False"]	True	1
e2f86e92-f885-4f2b-ac96-644db9cb94ab	5c50aa70-a328-47ab-ad2e-ef4ae40aaf63	9db2a60b-11fd-4c71-9f58-56c313dac02a	TF	The AVERAGE function calculates the mathematical average of the selected numbers.	AVERAGE ফাংশন দিয়ে সিলেক্ট করা সংখ্যার গড় বের করা যায়।	["True", "False"]	True	1
b975a0c6-1ce4-42be-8557-6b69b1a3428b	5c50aa70-a328-47ab-ad2e-ef4ae40aaf63	9db2a60b-11fd-4c71-9f58-56c313dac02a	TF	The TIME function requires days, months, and years to create a specific time.	TIME ফাংশন তৈরি করতে দিন, মাস আর বছরের দরকার হয়।	["True", "False"]	False	1
0e7f5ca9-1c4a-4205-9c24-f73e464ce63e	5c50aa70-a328-47ab-ad2e-ef4ae40aaf63	9db2a60b-11fd-4c71-9f58-56c313dac02a	TF	The RIGHT function extracts characters from the start (left side) of a text string.	RIGHT ফাংশন কোনো টেক্সটের বাঁ দিক থেকে অক্ষর বের করে আনে।	["True", "False"]	False	1
d2c86384-9cdd-40d4-a728-a174f7f2fbe1	5c50aa70-a328-47ab-ad2e-ef4ae40aaf63	9db2a60b-11fd-4c71-9f58-56c313dac02a	TF	The formula =MIN(D1:D5) will return the smallest number from D1 to D5.	=MIN(D1:D5) ফর্মুলাটি D1 থেকে D5 এর মধ্যে সবচেয়ে ছোট সংখ্যাটি বের করবে।	["True", "False"]	True	1
16fc6906-3890-4082-acfc-7ffe3019fed9	5c50aa70-a328-47ab-ad2e-ef4ae40aaf63	5ae09219-992a-49d9-93cd-cc56d4bc28c0	MATCH	Match Left to Right	বাম থেকে ডানে মিলান	{"left": ["Worksheet", "=SUM(A1:A5)", "Fill Series", "=TIME(14, 30, 0)", "=MID(\\"INDIA\\", 2, 3)"], "right": ["Creates 2:30 PM / 2:30 PM তৈরি করে", "Correct: Fills data in a 1, 2, 3 pattern / ১, ২, ৩ প্যাটার্ন অনুযায়ী পূরণ করে", "Returns \\"NDI\\" / \\"NDI\\" রেজাল্ট দেয়", "The grid page seen when opening Excel / এক্সেল ওপেন করলে যে ছককাটা পাতা দেখা যায়", "Adds multiple cell numbers together / একাধিক সেলের সংখ্যা যোগ করে"]}	{"=SUM(A1:A5)":"Adds multiple cell numbers together / একাধিক সেলের সংখ্যা যোগ করে","Fill Series":"Correct: Fills data in a 1, 2, 3 pattern / ১, ২, ৩ প্যাটার্ন অনুযায়ী পূরণ করে","=MID(\\"INDIA\\", 2, 3)":"Returns \\"NDI\\" / \\"NDI\\" রেজাল্ট দেয়","=TIME(14, 30, 0)":"Creates 2:30 PM / 2:30 PM তৈরি করে","Worksheet":"The grid page seen when opening Excel / এক্সেল ওপেন করলে যে ছককাটা পাতা দেখা যায়"}	5
7b2d2c55-55b5-45b9-856b-d715f3c90270	74d5a0b0-7659-43cc-89f0-499b6751139f	c7f73994-69af-4ecc-b13f-2d57e429dc75	MCQ	While a computer is waking up (booting), what is the most responsible thing a student should do?	কম্পিউটার যখন জেগে উঠছে (বুট হচ্ছে), তখন একজন ছাত্রের সবচেয়ে দায়িত্বশীল কাজ কী হওয়া উচিত?	["Press all the buttons on the keyboard quickly. / কীবোর্ডের সব বোতাম দ্রুত চেপে দেখা।", "Switch off the main power immediately. / মেইন পাওয়ার সুইচটি সাথে সাথে বন্ধ করে দেওয়া।", "Wait patiently without making random clicks. / এলোমেলো ক্লিক না করে ধৈর্য ধরে অপেক্ষা করা।", "Clean the mouse with water. / জল দিয়ে মাউসটি পরিষ্কার করা।"]	Wait patiently without making random clicks. / এলোমেলো ক্লিক না করে ধৈর্য ধরে অপেক্ষা করা।	1
136074ee-4b85-40ea-9e18-236180986b2c	74d5a0b0-7659-43cc-89f0-499b6751139f	c7f73994-69af-4ecc-b13f-2d57e429dc75	MCQ	Riya typed her name using the keyboard, but the monitor was turned off. Which part of the I-P-O cycle was completed successfully?	রিয়া কীবোর্ড ব্যবহার করে তার নাম টাইপ করল, কিন্তু মনিটরটি বন্ধ ছিল। এখানে I-P-O সাইকেলের কোন অংশটি সফলভাবে সম্পন্ন হয়েছে?	["Only Output / শুধুমাত্র আউটপুট (Output)", "Only Input / শুধুমাত্র ইনপুট (Input)", "Both Input and Output / ইনপুট এবং আউটপুট দুটোই", "Process and Output / প্রসেস এবং আউটপুট"]	Only Input / শুধুমাত্র ইনপুট (Input)	1
02a22274-6e49-43d8-b157-6f9d9f5fa18d	74d5a0b0-7659-43cc-89f0-499b6751139f	c7f73994-69af-4ecc-b13f-2d57e429dc75	MCQ	Why is a computer called a "Smart Machine" compared to a normal toaster?	একটি সাধারণ টোস্টারের তুলনায় কম্পিউটারকে কেন একটি "স্মার্ট মেশিন" বলা হয়?	["Because it needs electricity to run. / কারণ এটি চলার জন্য বিদ্যুতের প্রয়োজন হয়।", "Because it can do many different tasks like drawing, math, and music at the same time. / কারণ এটি একই সাথে ছবি আঁকা, অঙ্ক করা এবং গান চালানোর মতো অনেক রকমের কাজ করতে পারে।", "Because it is made of plastic. / কারণ এটি প্লাস্টিক দিয়ে তৈরি।", "Because it has a power button. / কারণ এতে একটি পাওয়ার বোতাম আছে।"]	Because it can do many different tasks like drawing, math, and music at the same time. / কারণ এটি একই সাথে ছবি আঁকা, অঙ্ক করা এবং গান চালানোর মতো অনেক রকমের কাজ করতে পারে।	1
002a8370-75a7-40e9-abe5-d8579aff5365	74d5a0b0-7659-43cc-89f0-499b6751139f	904c5467-7423-4b7b-be80-6ff582882fa0	FITB	The keyboard feeds data like letters and numbers into the computer, so it acts as the computer's ___________ device.	কীবোর্ড কম্পিউটারকে অক্ষর এবং সংখ্যার মতো ডেটা সরবরাহ করে, তাই এটি কম্পিউটারের একটি ___________ ডিভাইস হিসেবে কাজ করে।	["Input / ইনপুট"]	["Input / ইনপুট"]	1
5a8c4b9e-e6dd-4ea9-b794-c4ca30a8a16b	74d5a0b0-7659-43cc-89f0-499b6751139f	904c5467-7423-4b7b-be80-6ff582882fa0	FITB	If you want to hang a digital drawing on your bedroom wall, you must convert the soft copy into a ___________ copy using a printer.	তুমি যদি একটি ডিজিটাল আঁকা ছবি তোমার শোবার ঘরের দেয়ালে ঝোলাতে চাও, তবে প্রিন্টার ব্যবহার করে সফট কপিটিকে একটি ___________ কপিতে পরিবর্তন করতে হবে।	["Hard / হার্ড"]	["Hard / হার্ড"]	1
6d1bc6bc-1454-4b89-9aae-8b94acdc5e73	74d5a0b0-7659-43cc-89f0-499b6751139f	904c5467-7423-4b7b-be80-6ff582882fa0	FITB	A computer will never make a mistake in calculating a big sum unless the ___________ gives it the wrong instruction.	একটি বড় অঙ্কের হিসাব করার সময় কম্পিউটার কখনোই ভুল করবে না, যতক্ষণ না পর্যন্ত ___________ তাকে ভুল নির্দেশ দিচ্ছে।	["Human / মানুষ", "User / ব্যবহারকারী"]	["Human / মানুষ","User / ব্যবহারকারী"]	1
a8fa7cf0-2d31-4cc3-bcdd-34de348102be	74d5a0b0-7659-43cc-89f0-499b6751139f	904c5467-7423-4b7b-be80-6ff582882fa0	FITB	Think of the computer screen like your real study table. The very first screen you see after booting is called the ___________.	কম্পিউটারের স্ক্রিনটিকে তোমার পড়ার টেবিলের মতো ভাবো। বুট হওয়ার পর যে প্রথম স্ক্রিনটি তুমি দেখতে পাও তাকে ___________ বলে।	["Desktop / ডেক্সটপ"]	["Desktop / ডেক্সটপ"]	1
e21532bd-a3b4-4961-b6bf-b3b089109b3b	74d5a0b0-7659-43cc-89f0-499b6751139f	67bf1af3-5ec8-4cc4-9d63-fe353d6b41c0	TF	The CPU is called the brain of the computer because it does all the thinking and processing work.	CPU-কে কম্পিউটারের মস্তিষ্ক বলা হয় কারণ এটি সমস্ত চিন্তাভাবনা এবং প্রসেসিংয়ের কাজ করে।	["True", "False"]	True	1
17dbcc6f-8d7c-497e-a6c7-b974fa21997b	74d5a0b0-7659-43cc-89f0-499b6751139f	67bf1af3-5ec8-4cc4-9d63-fe353d6b41c0	TF	When we twist a blunt pencil inside a sharpener, this action represents the 'Process' stage of the I-P-O cycle.	আমরা যখন একটি ভোঁতা পেন্সিল শার্পনারের ভেতরে ঘোরোই, তখন এই কাজটি I-P-O সাইকেলের 'প্রসেস' (Process) ধাপটিকে বোঝায়।	["True", "False"]	True	1
3972b1b1-b849-4fff-acb9-7123335ee37d	74d5a0b0-7659-43cc-89f0-499b6751139f	67bf1af3-5ec8-4cc4-9d63-fe353d6b41c0	TF	A laptop computer is an example of a natural thing because humans use it everyday.	ল্যাপটপ কম্পিউটার হলো একটি প্রাকৃতিক জিনিসের উদাহরণ কারণ মানুষ এটি প্রতিদিন ব্যবহার করে।	["True", "False"]	False	1
cf208ba9-95ec-4ee5-acc7-d2c012841195	74d5a0b0-7659-43cc-89f0-499b6751139f	c7f73994-69af-4ecc-b13f-2d57e429dc75	MCQ	If a computer is running all day and night without stopping, what will happen to it?	যদি একটি কম্পিউটার কোনো বিরতি ছাড়া সারাদিন ও সারারাত চলতে থাকে, তবে সেটির কী হবে?	["It will get hungry like a human. / মানুষের মতো তারও খিদে পাবে।", "It will sleep on its own / সে নিজে নিজেই ঘুমিয়ে পড়বে।", "It will keep working without getting tired. / ক্লান্ত না হয়ে সে একটানা কাজ করে যাবে।", "It will forget all its files. / সে তার সব ফাইল ভুলে যাবে।"]	It will keep working without getting tired. / ক্লান্ত না হয়ে সে একটানা কাজ করে যাবে।	1
8136dca8-ffca-4b6c-963b-ba2f642fdaee	74d5a0b0-7659-43cc-89f0-499b6751139f	c7f73994-69af-4ecc-b13f-2d57e429dc75	MCQ	If you throw a stone at a cartoon character running on the television screen, you will hit the glass screen but you cannot catch the character. Why?	টেলিভিশন স্ক্রিনে চলা একটি কার্টুন চরিত্রের দিকে তুমি যদি একটি পাথর ছুড়ে মারো, তবে তোমার পাথরটি কাচের স্ক্রিনে লাগবে কিন্তু তুমি চরিত্রটিকে ধরতে পারবে না। কেন?	["The cartoon character is Hardware. / কার্টুন চরিত্রটি হলো হার্ডওয়্যার।", "The television screen is Software. / টেলিভিশন স্ক্রিনটি হলো সফটওয়্যার।", "The cartoon character is Software. / কার্টুন চরিত্রটি হলো সফটওয়্যার।", "The remote control is hidden. / রিমোট কন্ট্রোলটি লুকানো আছে।"]	The cartoon character is Software. / কার্টুন চরিত্রটি হলো সফটওয়্যার।	1
c840af0c-dcb0-4de8-9659-ea81249bee44	74d5a0b0-7659-43cc-89f0-499b6751139f	904c5467-7423-4b7b-be80-6ff582882fa0	FITB	A regular computer cannot make its own decisions because it does not have any ___________.	একটি সাধারণ কম্পিউটার নিজের থেকে কোনো সিদ্ধান্ত নিতে পারে না কারণ তার কোনো ___________ নেই।	["Feelings or Brain / অনুভূতি বা নিজস্ব বুদ্ধি"]	["Feelings or Brain / অনুভূতি বা নিজস্ব বুদ্ধি"]	1
77111870-6a87-4ba3-b3b0-89dfadb379d4	74d5a0b0-7659-43cc-89f0-499b6751139f	67bf1af3-5ec8-4cc4-9d63-fe353d6b41c0	TF	MS Paint is an example of hardware because you can see it clearly on the screen.	এমএস পেন্ট (MS Paint) হলো হার্ডওয়্যারের একটি উদাহরণ কারণ তুমি এটি স্ক্রিনে পরিষ্কার দেখতে পাও।	["True", "False"]	False	1
2727adab-dfed-48f6-b9ee-fb0b02e9dce3	74d5a0b0-7659-43cc-89f0-499b6751139f	67bf1af3-5ec8-4cc4-9d63-fe353d6b41c0	TF	Headphones are input devices because they send music directly into our ears.	হেডফোন হলো ইনপুট ডিভাইস কারণ এগুলো সরাসরি আমাদের কানে গান পাঠায়।	["True", "False"]	False	1
14edfa07-34b3-4b0f-b80d-1d62004168b1	74d5a0b0-7659-43cc-89f0-499b6751139f	e46f4a66-a4fb-49bd-9275-d264106a429f	MATCH	Match the items in Column A with their correct matches in Column B.	বাম দিকের স্তম্ভের (Column A) বিষয়গুলোর সাথে ডান দিকের স্তম্ভের (Column B) সঠিক জোড়াটি মেলাও।	{"left": ["The Monitor / মনিটর (Monitor)", "The CPU Cabinet / CPU ক্যাবিনেট", "A Microphone / মাইক্রোফোন", "Plastic Mouse and Wires / প্লাস্টিকের মাউস এবং তার", "Speakers / স্পিকার (Speakers)", "Sliced Mangoes + Milk + Sugar / কাটা আম + দুধ + চিনি", "The Taskbar / টাস্কবার (Taskbar)", "Clean Clothes / পরিষ্কার কাপড়", "Car Racing Game / কার রেসিং গেম", "Mouse Clicks / মাউস ক্লিক (Mouse Click)"], "right": ["A hardware component acting like the computer's ear / একটি হার্ডওয়্যার অংশ যা কম্পিউটারের কানের মতো কাজ করে", "The final product or 'Output' after the wash cycle ends / ওয়াশ সাইকেল শেষ হওয়ার পরের চূড়ান্ত ফলাফল বা 'আউটপুট'", "An output device that makes sound loud for the whole class / একটি আউটপুট ডিভাইস যা পুরো ক্লাসের জন্য শব্দ তৈরি করে", "The physical, heavy box acting as the computer's brain case / একটি ভারী ভৌত বাক্স যা কম্পিউটারের মস্তিষ্কের আধার হিসেবে কাজ করে", "The physical 'body' parts of the machine you can touch / কম্পিউটারের ফিজিক্যাল 'শরীর'-এর অংশ যা তুমি স্পর্শ করতে পারো", "The raw 'Input' ingredients needed to build a shake / শেক তৈরি করার জন্য প্রয়োজনীয় প্রাথমিক 'ইনপুট' উপাদান", "The visual 'Soft Copy' screen showing what the system does / একটি ভিজ্যুয়াল 'সফট কপি' স্ক্রিন যা ভেতরের কাজগুলো দেখায়", "The long strip at the bottom showing currently running apps / নিচের লম্বা স্ট্রিপ যা বর্তমানে চলমান অ্যাপসগুলোকে দেখায়", "A digital playground or program you can use but cannot touch / একটি ডিজিটাল খেলার জায়গা বা প্রোগ্রাম যা স্পর্শ করা যায় না", "The 'Input' data fed by clicking to select items / ক্লিক করে আইটেম সিলেক্ট করার মাধ্যমে পাঠানো 'ইনপুট' ডেটা"]}	{"Sliced Mangoes + Milk + Sugar / কাটা আম + দুধ + চিনি":"The raw 'Input' ingredients needed to build a shake / শেক তৈরি করার জন্য প্রয়োজনীয় প্রাথমিক 'ইনপুট' উপাদান","The Taskbar / টাস্কবার (Taskbar)":"The long strip at the bottom showing currently running apps / নিচের লম্বা স্ট্রিপ যা বর্তমানে চলমান অ্যাপসগুলোকে দেখায়","Clean Clothes / পরিষ্কার কাপড়":"The final product or 'Output' after the wash cycle ends / ওয়াশ সাইকেল শেষ হওয়ার পরের চূড়ান্ত ফলাফল বা 'আউটপুট'","A Microphone / মাইক্রোফোন":"A hardware component acting like the computer's ear / একটি হার্ডওয়্যার অংশ যা কম্পিউটারের কানের মতো কাজ করে","Plastic Mouse and Wires / প্লাস্টিকের মাউস এবং তার":"The physical 'body' parts of the machine you can touch / কম্পিউটারের ফিজিক্যাল 'শরীর'-এর অংশ যা তুমি স্পর্শ করতে পারো","The Monitor / মনিটর (Monitor)":"The visual 'Soft Copy' screen showing what the system does / একটি ভিজ্যুয়াল 'সফট কপি' স্ক্রিন যা ভেতরের কাজগুলো দেখায়","Mouse Clicks / মাউস ক্লিক (Mouse Click)":"The 'Input' data fed by clicking to select items / ক্লিক করে আইটেম সিলেক্ট করার মাধ্যমে পাঠানো 'ইনপুট' ডেটা","The CPU Cabinet / CPU ক্যাবিনেট":"The physical, heavy box acting as the computer's brain case / একটি ভারী ভৌত বাক্স যা কম্পিউটারের মস্তিষ্কের আধার হিসেবে কাজ করে","Car Racing Game / কার রেসিং গেম":"A digital playground or program you can use but cannot touch / একটি ডিজিটাল খেলার জায়গা বা প্রোগ্রাম যা স্পর্শ করা যায় না","Speakers / স্পিকার (Speakers)":"An output device that makes sound loud for the whole class / একটি আউটপুট ডিভাইস যা পুরো ক্লাসের জন্য শব্দ তৈরি করে"}	10
\.


--
-- Data for Name: student_responses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.student_responses (session_id, question_id, selected_option, is_correct, awarded_marks) FROM stdin;
79a9a47f-3545-4875-ba0b-4f2b4324be39	47afac17-2732-4645-9833-725035b5f0ee	opt_dd1961a9	t	1.00
ea82a606-80eb-485b-83b6-3d03c8d514ee	47afac17-2732-4645-9833-725035b5f0ee	opt_dd1961a9	t	1.00
24e3503b-7eaf-42b8-89a5-7d9dba089600	47afac17-2732-4645-9833-725035b5f0ee	opt_dd1961a9	t	1.00
03ab548e-ebf8-48db-9edd-f1488a56bc9d	47afac17-2732-4645-9833-725035b5f0ee	opt_dd1961a9	t	1.00
2f602a81-b09b-4c20-bfad-72f83aba7e05	47afac17-2732-4645-9833-725035b5f0ee	opt_dd1961a9	t	1.00
33c74e71-28fb-453a-a774-36b74d602129	47afac17-2732-4645-9833-725035b5f0ee	opt_dd1961a9	t	1.00
79a9a47f-3545-4875-ba0b-4f2b4324be39	5e820249-1a2a-4819-b3dd-9dc58fcabf5a	opt_a2ab500f	t	1.00
351eacd1-6321-4784-8841-870ab4c14af8	47afac17-2732-4645-9833-725035b5f0ee	opt_dd1961a9	t	1.00
1e3c7aa0-9622-4a4f-8b95-ab0c60c0453b	47afac17-2732-4645-9833-725035b5f0ee	opt_dd1961a9	t	1.00
bdc82668-ec39-40f9-8555-42449cd34740	47afac17-2732-4645-9833-725035b5f0ee	opt_dd1961a9	t	1.00
ea82a606-80eb-485b-83b6-3d03c8d514ee	5e820249-1a2a-4819-b3dd-9dc58fcabf5a	opt_a2ab500f	t	1.00
2f602a81-b09b-4c20-bfad-72f83aba7e05	5e820249-1a2a-4819-b3dd-9dc58fcabf5a	opt_a2ab500f	t	1.00
24e3503b-7eaf-42b8-89a5-7d9dba089600	5e820249-1a2a-4819-b3dd-9dc58fcabf5a	opt_5d39aa01	f	0.00
dc9f7a74-b535-407f-8da2-0b9290b88dbb	47afac17-2732-4645-9833-725035b5f0ee	opt_dd1961a9	t	1.00
351eacd1-6321-4784-8841-870ab4c14af8	5e820249-1a2a-4819-b3dd-9dc58fcabf5a	opt_a2ab500f	t	1.00
351eacd1-6321-4784-8841-870ab4c14af8	8a269244-5de5-44b9-9728-22c58610f44c	opt_152a5349	f	0.00
1e3c7aa0-9622-4a4f-8b95-ab0c60c0453b	5e820249-1a2a-4819-b3dd-9dc58fcabf5a	opt_a2ab500f	t	1.00
2f602a81-b09b-4c20-bfad-72f83aba7e05	8a269244-5de5-44b9-9728-22c58610f44c	opt_152a5349	f	0.00
03ab548e-ebf8-48db-9edd-f1488a56bc9d	5e820249-1a2a-4819-b3dd-9dc58fcabf5a	opt_8a468396	f	0.00
79a9a47f-3545-4875-ba0b-4f2b4324be39	4e903aae-4a32-4aaf-9c04-d3afd67dd3ff	opt_4f843fa4	t	1.00
ea82a606-80eb-485b-83b6-3d03c8d514ee	4e903aae-4a32-4aaf-9c04-d3afd67dd3ff	opt_4f843fa4	t	1.00
1e3c7aa0-9622-4a4f-8b95-ab0c60c0453b	8a269244-5de5-44b9-9728-22c58610f44c	opt_6f13c03b	f	0.00
33c74e71-28fb-453a-a774-36b74d602129	5e820249-1a2a-4819-b3dd-9dc58fcabf5a	opt_a2ab500f	t	1.00
79a9a47f-3545-4875-ba0b-4f2b4324be39	2cd0fb2f-f3fc-409d-ac74-1d4e2acfc219	opt_f159b4ff	t	1.00
ea82a606-80eb-485b-83b6-3d03c8d514ee	2cd0fb2f-f3fc-409d-ac74-1d4e2acfc219	opt_f159b4ff	t	1.00
351eacd1-6321-4784-8841-870ab4c14af8	4e903aae-4a32-4aaf-9c04-d3afd67dd3ff	opt_4f843fa4	t	1.00
2f602a81-b09b-4c20-bfad-72f83aba7e05	4e903aae-4a32-4aaf-9c04-d3afd67dd3ff	opt_4f843fa4	t	1.00
351eacd1-6321-4784-8841-870ab4c14af8	2cd0fb2f-f3fc-409d-ac74-1d4e2acfc219	opt_f159b4ff	t	1.00
1e3c7aa0-9622-4a4f-8b95-ab0c60c0453b	4e903aae-4a32-4aaf-9c04-d3afd67dd3ff	opt_4f843fa4	t	1.00
2f602a81-b09b-4c20-bfad-72f83aba7e05	2cd0fb2f-f3fc-409d-ac74-1d4e2acfc219	opt_f159b4ff	t	1.00
24e3503b-7eaf-42b8-89a5-7d9dba089600	8a269244-5de5-44b9-9728-22c58610f44c	opt_b0f85ea7	f	0.00
ea82a606-80eb-485b-83b6-3d03c8d514ee	9d998d8c-06e6-47f0-8b3a-1a594cb2e461	["opt_b66d09b7"]	t	1.00
24e3503b-7eaf-42b8-89a5-7d9dba089600	4e903aae-4a32-4aaf-9c04-d3afd67dd3ff	opt_4f843fa4	t	1.00
33c74e71-28fb-453a-a774-36b74d602129	4e903aae-4a32-4aaf-9c04-d3afd67dd3ff	opt_9f2fee31	f	0.00
03ab548e-ebf8-48db-9edd-f1488a56bc9d	8a269244-5de5-44b9-9728-22c58610f44c	opt_b0f85ea7	f	0.00
1e3c7aa0-9622-4a4f-8b95-ab0c60c0453b	2cd0fb2f-f3fc-409d-ac74-1d4e2acfc219	opt_f299055c	f	0.00
24e3503b-7eaf-42b8-89a5-7d9dba089600	2cd0fb2f-f3fc-409d-ac74-1d4e2acfc219	opt_f159b4ff	t	1.00
351eacd1-6321-4784-8841-870ab4c14af8	9d998d8c-06e6-47f0-8b3a-1a594cb2e461	["opt_b66d09b7"]	t	1.00
79a9a47f-3545-4875-ba0b-4f2b4324be39	9d998d8c-06e6-47f0-8b3a-1a594cb2e461	["opt_b66d09b7"]	t	1.00
2f602a81-b09b-4c20-bfad-72f83aba7e05	9d998d8c-06e6-47f0-8b3a-1a594cb2e461	["opt_b66d09b7"]	t	1.00
2f602a81-b09b-4c20-bfad-72f83aba7e05	74986336-9e63-400a-b22e-dae356d05bd1	["opt_7e516a26"]	t	1.00
03ab548e-ebf8-48db-9edd-f1488a56bc9d	4e903aae-4a32-4aaf-9c04-d3afd67dd3ff	opt_4f843fa4	t	1.00
24e3503b-7eaf-42b8-89a5-7d9dba089600	9d998d8c-06e6-47f0-8b3a-1a594cb2e461	["opt_b66d09b7"]	t	1.00
351eacd1-6321-4784-8841-870ab4c14af8	74986336-9e63-400a-b22e-dae356d05bd1	["opt_7e516a26"]	t	1.00
33c74e71-28fb-453a-a774-36b74d602129	2cd0fb2f-f3fc-409d-ac74-1d4e2acfc219	opt_f159b4ff	t	1.00
03ab548e-ebf8-48db-9edd-f1488a56bc9d	2cd0fb2f-f3fc-409d-ac74-1d4e2acfc219	opt_f159b4ff	t	1.00
2f602a81-b09b-4c20-bfad-72f83aba7e05	5e369759-589c-4539-976e-d21c6dadfe26	["opt_dab3ef29"]	t	1.00
24e3503b-7eaf-42b8-89a5-7d9dba089600	74986336-9e63-400a-b22e-dae356d05bd1	["opt_e74451e6"]	f	0.00
79a9a47f-3545-4875-ba0b-4f2b4324be39	8a269244-5de5-44b9-9728-22c58610f44c	opt_152a5349	f	0.00
ea82a606-80eb-485b-83b6-3d03c8d514ee	8a269244-5de5-44b9-9728-22c58610f44c	opt_152a5349	f	0.00
1e3c7aa0-9622-4a4f-8b95-ab0c60c0453b	9d998d8c-06e6-47f0-8b3a-1a594cb2e461	["opt_b66d09b7"]	t	1.00
ea82a606-80eb-485b-83b6-3d03c8d514ee	74986336-9e63-400a-b22e-dae356d05bd1	["opt_ceb17261"]	f	0.00
bdc82668-ec39-40f9-8555-42449cd34740	2cd0fb2f-f3fc-409d-ac74-1d4e2acfc219	opt_f159b4ff	t	1.00
79a9a47f-3545-4875-ba0b-4f2b4324be39	74986336-9e63-400a-b22e-dae356d05bd1	["opt_ceb17261"]	f	0.00
79a9a47f-3545-4875-ba0b-4f2b4324be39	5e369759-589c-4539-976e-d21c6dadfe26	["opt_dab3ef29"]	t	1.00
2f602a81-b09b-4c20-bfad-72f83aba7e05	f102540d-9197-4ff0-9c4b-9605054a0a15	["opt_86560393"]	t	1.00
03ab548e-ebf8-48db-9edd-f1488a56bc9d	9d998d8c-06e6-47f0-8b3a-1a594cb2e461	["opt_b66d09b7"]	t	1.00
24e3503b-7eaf-42b8-89a5-7d9dba089600	5e369759-589c-4539-976e-d21c6dadfe26	["opt_86560393"]	f	0.00
351eacd1-6321-4784-8841-870ab4c14af8	5e369759-589c-4539-976e-d21c6dadfe26	["opt_dab3ef29"]	t	1.00
1e3c7aa0-9622-4a4f-8b95-ab0c60c0453b	74986336-9e63-400a-b22e-dae356d05bd1	["opt_7e516a26"]	t	1.00
79a9a47f-3545-4875-ba0b-4f2b4324be39	f102540d-9197-4ff0-9c4b-9605054a0a15	["opt_86560393"]	t	1.00
2f602a81-b09b-4c20-bfad-72f83aba7e05	3e1e7a5b-af98-4fa4-bdb0-fd80fd61c863	["opt_e74451e6"]	t	1.00
33c74e71-28fb-453a-a774-36b74d602129	8a269244-5de5-44b9-9728-22c58610f44c	opt_6f13c03b	f	0.00
ea82a606-80eb-485b-83b6-3d03c8d514ee	5e369759-589c-4539-976e-d21c6dadfe26	["opt_dab3ef29"]	t	1.00
bdc82668-ec39-40f9-8555-42449cd34740	9d998d8c-06e6-47f0-8b3a-1a594cb2e461	["opt_b66d09b7"]	t	1.00
24e3503b-7eaf-42b8-89a5-7d9dba089600	f102540d-9197-4ff0-9c4b-9605054a0a15	["opt_dab3ef29"]	f	0.00
ea82a606-80eb-485b-83b6-3d03c8d514ee	f102540d-9197-4ff0-9c4b-9605054a0a15	["opt_86560393"]	t	1.00
79a9a47f-3545-4875-ba0b-4f2b4324be39	3e1e7a5b-af98-4fa4-bdb0-fd80fd61c863	["opt_e74451e6"]	t	1.00
24e3503b-7eaf-42b8-89a5-7d9dba089600	3e1e7a5b-af98-4fa4-bdb0-fd80fd61c863	["opt_ceb17261"]	f	0.00
351eacd1-6321-4784-8841-870ab4c14af8	f102540d-9197-4ff0-9c4b-9605054a0a15	["opt_86560393"]	t	1.00
1e3c7aa0-9622-4a4f-8b95-ab0c60c0453b	3e1e7a5b-af98-4fa4-bdb0-fd80fd61c863	["opt_e74451e6"]	t	1.00
79a9a47f-3545-4875-ba0b-4f2b4324be39	1dad6cea-4651-41a2-b39f-a893ceb4a6c5	opt_true	t	1.00
33c74e71-28fb-453a-a774-36b74d602129	9d998d8c-06e6-47f0-8b3a-1a594cb2e461	["opt_b66d09b7"]	t	1.00
24e3503b-7eaf-42b8-89a5-7d9dba089600	1dad6cea-4651-41a2-b39f-a893ceb4a6c5	opt_true	t	1.00
351eacd1-6321-4784-8841-870ab4c14af8	3e1e7a5b-af98-4fa4-bdb0-fd80fd61c863	["opt_e74451e6"]	t	1.00
03ab548e-ebf8-48db-9edd-f1488a56bc9d	74986336-9e63-400a-b22e-dae356d05bd1	["opt_ceb17261"]	f	0.00
bdc82668-ec39-40f9-8555-42449cd34740	74986336-9e63-400a-b22e-dae356d05bd1	["opt_e74451e6"]	f	0.00
ea82a606-80eb-485b-83b6-3d03c8d514ee	1dad6cea-4651-41a2-b39f-a893ceb4a6c5	opt_true	t	1.00
79a9a47f-3545-4875-ba0b-4f2b4324be39	4d0d14e5-43cd-4fa4-a710-201e5b235813	opt_false	f	0.00
24e3503b-7eaf-42b8-89a5-7d9dba089600	4d0d14e5-43cd-4fa4-a710-201e5b235813	opt_false	f	0.00
24e3503b-7eaf-42b8-89a5-7d9dba089600	6cae5623-95c1-464c-be0b-56ebfa95c90e	opt_true	f	0.00
2f602a81-b09b-4c20-bfad-72f83aba7e05	1dad6cea-4651-41a2-b39f-a893ceb4a6c5	opt_false	f	0.00
1e3c7aa0-9622-4a4f-8b95-ab0c60c0453b	1dad6cea-4651-41a2-b39f-a893ceb4a6c5	opt_false	f	0.00
24e3503b-7eaf-42b8-89a5-7d9dba089600	285d42fa-6f44-4124-b723-91d1d8f5331a	opt_false	t	1.00
24e3503b-7eaf-42b8-89a5-7d9dba089600	2bc66a81-be3a-455a-b276-dcea37c3f786	opt_true	f	0.00
bdc82668-ec39-40f9-8555-42449cd34740	5e369759-589c-4539-976e-d21c6dadfe26	["opt_86560393"]	f	0.00
79a9a47f-3545-4875-ba0b-4f2b4324be39	6cae5623-95c1-464c-be0b-56ebfa95c90e	opt_false	t	1.00
1e3c7aa0-9622-4a4f-8b95-ab0c60c0453b	5e369759-589c-4539-976e-d21c6dadfe26	["opt_3817be67"]	f	0.00
bdc82668-ec39-40f9-8555-42449cd34740	5e820249-1a2a-4819-b3dd-9dc58fcabf5a	opt_a2ab500f	t	1.00
bdc82668-ec39-40f9-8555-42449cd34740	8a269244-5de5-44b9-9728-22c58610f44c	opt_152a5349	f	0.00
1e3c7aa0-9622-4a4f-8b95-ab0c60c0453b	f102540d-9197-4ff0-9c4b-9605054a0a15	["opt_86560393"]	t	1.00
bdc82668-ec39-40f9-8555-42449cd34740	4e903aae-4a32-4aaf-9c04-d3afd67dd3ff	opt_4f843fa4	t	1.00
33c74e71-28fb-453a-a774-36b74d602129	74986336-9e63-400a-b22e-dae356d05bd1	["opt_ceb17261"]	f	0.00
ea82a606-80eb-485b-83b6-3d03c8d514ee	6cae5623-95c1-464c-be0b-56ebfa95c90e	opt_false	t	1.00
351eacd1-6321-4784-8841-870ab4c14af8	1dad6cea-4651-41a2-b39f-a893ceb4a6c5	opt_false	f	0.00
79a9a47f-3545-4875-ba0b-4f2b4324be39	285d42fa-6f44-4124-b723-91d1d8f5331a	opt_true	f	0.00
03ab548e-ebf8-48db-9edd-f1488a56bc9d	5e369759-589c-4539-976e-d21c6dadfe26	["opt_86560393"]	f	0.00
2f602a81-b09b-4c20-bfad-72f83aba7e05	9f9846dc-5b05-4ee3-a8d0-0360d8552ada	{"opt_e6b50d01":"opt_ac59de90","opt_c23b289b":"opt_1fb2aa55","opt_f190cefa":"opt_2f50a64b","opt_ebf395ae":"opt_3b71d0c0","opt_d9ebff3d":"opt_e5816d34"}	t	5.00
79a9a47f-3545-4875-ba0b-4f2b4324be39	2bc66a81-be3a-455a-b276-dcea37c3f786	opt_true	f	0.00
351eacd1-6321-4784-8841-870ab4c14af8	4d0d14e5-43cd-4fa4-a710-201e5b235813	opt_false	f	0.00
ea82a606-80eb-485b-83b6-3d03c8d514ee	285d42fa-6f44-4124-b723-91d1d8f5331a	opt_true	f	0.00
24e3503b-7eaf-42b8-89a5-7d9dba089600	9f9846dc-5b05-4ee3-a8d0-0360d8552ada	{"opt_e6b50d01":"opt_ac59de90","opt_c23b289b":"opt_1fb2aa55","opt_f190cefa":"opt_2f50a64b","opt_ebf395ae":"opt_3b71d0c0","opt_d9ebff3d":"opt_e5816d34"}	t	5.00
351eacd1-6321-4784-8841-870ab4c14af8	6cae5623-95c1-464c-be0b-56ebfa95c90e	opt_false	t	1.00
1e3c7aa0-9622-4a4f-8b95-ab0c60c0453b	4d0d14e5-43cd-4fa4-a710-201e5b235813	opt_true	t	1.00
ea82a606-80eb-485b-83b6-3d03c8d514ee	2bc66a81-be3a-455a-b276-dcea37c3f786	opt_true	f	0.00
33c74e71-28fb-453a-a774-36b74d602129	3e1e7a5b-af98-4fa4-bdb0-fd80fd61c863	["opt_e74451e6"]	t	1.00
bdc82668-ec39-40f9-8555-42449cd34740	9f9846dc-5b05-4ee3-a8d0-0360d8552ada	{"opt_e6b50d01":"opt_ac59de90","opt_ebf395ae":"opt_3b71d0c0","opt_f190cefa":"opt_1fb2aa55","opt_d9ebff3d":"opt_e5816d34","opt_c23b289b":"opt_2f50a64b"}	f	3.00
33c74e71-28fb-453a-a774-36b74d602129	2bc66a81-be3a-455a-b276-dcea37c3f786	opt_false	t	1.00
2f602a81-b09b-4c20-bfad-72f83aba7e05	4d0d14e5-43cd-4fa4-a710-201e5b235813	opt_true	t	1.00
03ab548e-ebf8-48db-9edd-f1488a56bc9d	4d0d14e5-43cd-4fa4-a710-201e5b235813	opt_true	t	1.00
79a9a47f-3545-4875-ba0b-4f2b4324be39	9f9846dc-5b05-4ee3-a8d0-0360d8552ada	{"opt_e6b50d01":"opt_ac59de90","opt_c23b289b":"opt_1fb2aa55","opt_f190cefa":"opt_2f50a64b","opt_d9ebff3d":"opt_e5816d34","opt_ebf395ae":"opt_3b71d0c0"}	t	5.00
33c74e71-28fb-453a-a774-36b74d602129	6cae5623-95c1-464c-be0b-56ebfa95c90e	opt_false	t	1.00
dc9f7a74-b535-407f-8da2-0b9290b88dbb	8a269244-5de5-44b9-9728-22c58610f44c	opt_b0f85ea7	f	0.00
03ab548e-ebf8-48db-9edd-f1488a56bc9d	6cae5623-95c1-464c-be0b-56ebfa95c90e	opt_false	t	1.00
351eacd1-6321-4784-8841-870ab4c14af8	2bc66a81-be3a-455a-b276-dcea37c3f786	opt_false	t	1.00
2f602a81-b09b-4c20-bfad-72f83aba7e05	6cae5623-95c1-464c-be0b-56ebfa95c90e	opt_false	t	1.00
ea82a606-80eb-485b-83b6-3d03c8d514ee	9f9846dc-5b05-4ee3-a8d0-0360d8552ada	{"opt_e6b50d01":"opt_ac59de90","opt_d9ebff3d":"opt_e5816d34","opt_c23b289b":"opt_1fb2aa55","opt_f190cefa":"opt_2f50a64b","opt_ebf395ae":"opt_3b71d0c0"}	t	5.00
bdc82668-ec39-40f9-8555-42449cd34740	f102540d-9197-4ff0-9c4b-9605054a0a15	["opt_3817be67"]	f	0.00
1e3c7aa0-9622-4a4f-8b95-ab0c60c0453b	6cae5623-95c1-464c-be0b-56ebfa95c90e	opt_false	t	1.00
bdc82668-ec39-40f9-8555-42449cd34740	3e1e7a5b-af98-4fa4-bdb0-fd80fd61c863	["opt_7e516a26"]	f	0.00
33c74e71-28fb-453a-a774-36b74d602129	1dad6cea-4651-41a2-b39f-a893ceb4a6c5	opt_true	t	1.00
dc9f7a74-b535-407f-8da2-0b9290b88dbb	5e820249-1a2a-4819-b3dd-9dc58fcabf5a	opt_5d39aa01	f	0.00
dc9f7a74-b535-407f-8da2-0b9290b88dbb	9f9846dc-5b05-4ee3-a8d0-0360d8552ada	{"opt_e6b50d01":"opt_ac59de90","opt_c23b289b":"opt_1fb2aa55","opt_d9ebff3d":"opt_e5816d34","opt_ebf395ae":"opt_3b71d0c0","opt_f190cefa":"opt_2f50a64b"}	t	5.00
dc9f7a74-b535-407f-8da2-0b9290b88dbb	2cd0fb2f-f3fc-409d-ac74-1d4e2acfc219	opt_f159b4ff	t	1.00
dc9f7a74-b535-407f-8da2-0b9290b88dbb	4d0d14e5-43cd-4fa4-a710-201e5b235813	opt_false	f	0.00
bdc82668-ec39-40f9-8555-42449cd34740	1dad6cea-4651-41a2-b39f-a893ceb4a6c5	opt_true	t	1.00
ea82a606-80eb-485b-83b6-3d03c8d514ee	3e1e7a5b-af98-4fa4-bdb0-fd80fd61c863	["opt_e74451e6"]	t	1.00
03ab548e-ebf8-48db-9edd-f1488a56bc9d	9f9846dc-5b05-4ee3-a8d0-0360d8552ada	{"opt_e6b50d01":"opt_ac59de90","opt_c23b289b":"opt_1fb2aa55","opt_f190cefa":"opt_2f50a64b","opt_d9ebff3d":"opt_e5816d34","opt_ebf395ae":"opt_3b71d0c0"}	t	5.00
351eacd1-6321-4784-8841-870ab4c14af8	9f9846dc-5b05-4ee3-a8d0-0360d8552ada	{"opt_e6b50d01":"opt_ac59de90","opt_c23b289b":"opt_1fb2aa55","opt_ebf395ae":"opt_3b71d0c0","opt_f190cefa":"opt_2f50a64b","opt_d9ebff3d":"opt_e5816d34"}	t	5.00
bdc82668-ec39-40f9-8555-42449cd34740	4d0d14e5-43cd-4fa4-a710-201e5b235813	opt_false	f	0.00
bdc82668-ec39-40f9-8555-42449cd34740	6cae5623-95c1-464c-be0b-56ebfa95c90e	opt_false	t	1.00
dc9f7a74-b535-407f-8da2-0b9290b88dbb	4e903aae-4a32-4aaf-9c04-d3afd67dd3ff	opt_4f843fa4	t	1.00
03ab548e-ebf8-48db-9edd-f1488a56bc9d	3e1e7a5b-af98-4fa4-bdb0-fd80fd61c863	["opt_e74451e6"]	t	1.00
33c74e71-28fb-453a-a774-36b74d602129	4d0d14e5-43cd-4fa4-a710-201e5b235813	opt_true	t	1.00
2f602a81-b09b-4c20-bfad-72f83aba7e05	285d42fa-6f44-4124-b723-91d1d8f5331a	opt_false	t	1.00
33c74e71-28fb-453a-a774-36b74d602129	f102540d-9197-4ff0-9c4b-9605054a0a15	["opt_86560393"]	t	1.00
1e3c7aa0-9622-4a4f-8b95-ab0c60c0453b	285d42fa-6f44-4124-b723-91d1d8f5331a	opt_false	t	1.00
bdc82668-ec39-40f9-8555-42449cd34740	285d42fa-6f44-4124-b723-91d1d8f5331a	opt_false	t	1.00
03ab548e-ebf8-48db-9edd-f1488a56bc9d	f102540d-9197-4ff0-9c4b-9605054a0a15	["opt_7e516a26"]	f	0.00
33c74e71-28fb-453a-a774-36b74d602129	5e369759-589c-4539-976e-d21c6dadfe26	["opt_7e516a26"]	f	0.00
2f602a81-b09b-4c20-bfad-72f83aba7e05	2bc66a81-be3a-455a-b276-dcea37c3f786	opt_false	t	1.00
1e3c7aa0-9622-4a4f-8b95-ab0c60c0453b	9f9846dc-5b05-4ee3-a8d0-0360d8552ada	{"opt_e6b50d01":"opt_ac59de90","opt_d9ebff3d":"opt_e5816d34","opt_ebf395ae":"opt_3b71d0c0","opt_f190cefa":"opt_2f50a64b","opt_c23b289b":"opt_1fb2aa55"}	t	5.00
bdc82668-ec39-40f9-8555-42449cd34740	2bc66a81-be3a-455a-b276-dcea37c3f786	opt_false	t	1.00
ea82a606-80eb-485b-83b6-3d03c8d514ee	4d0d14e5-43cd-4fa4-a710-201e5b235813	opt_false	f	0.00
33c74e71-28fb-453a-a774-36b74d602129	285d42fa-6f44-4124-b723-91d1d8f5331a	opt_false	t	1.00
1e3c7aa0-9622-4a4f-8b95-ab0c60c0453b	2bc66a81-be3a-455a-b276-dcea37c3f786	opt_false	t	1.00
03ab548e-ebf8-48db-9edd-f1488a56bc9d	1dad6cea-4651-41a2-b39f-a893ceb4a6c5	opt_false	f	0.00
33c74e71-28fb-453a-a774-36b74d602129	9f9846dc-5b05-4ee3-a8d0-0360d8552ada	{"opt_e6b50d01":"opt_ac59de90","opt_c23b289b":"opt_1fb2aa55","opt_ebf395ae":"opt_3b71d0c0","opt_f190cefa":"opt_2f50a64b","opt_d9ebff3d":"opt_e5816d34"}	t	5.00
351eacd1-6321-4784-8841-870ab4c14af8	285d42fa-6f44-4124-b723-91d1d8f5331a	opt_false	t	1.00
03ab548e-ebf8-48db-9edd-f1488a56bc9d	285d42fa-6f44-4124-b723-91d1d8f5331a	opt_false	t	1.00
dc9f7a74-b535-407f-8da2-0b9290b88dbb	6cae5623-95c1-464c-be0b-56ebfa95c90e	opt_true	f	0.00
03ab548e-ebf8-48db-9edd-f1488a56bc9d	2bc66a81-be3a-455a-b276-dcea37c3f786	opt_false	t	1.00
dc9f7a74-b535-407f-8da2-0b9290b88dbb	9d998d8c-06e6-47f0-8b3a-1a594cb2e461	["opt_3817be67"]	f	0.00
dc9f7a74-b535-407f-8da2-0b9290b88dbb	1dad6cea-4651-41a2-b39f-a893ceb4a6c5	opt_false	f	0.00
dc9f7a74-b535-407f-8da2-0b9290b88dbb	2bc66a81-be3a-455a-b276-dcea37c3f786	opt_true	f	0.00
159182f4-ff10-497c-b0ce-c3adc8d012e0	a6c19706-467e-466b-ad72-c49fa7f225bc	opt_46249571	t	1.00
00a7405d-ab37-4399-a40b-7f6b3158de74	b3b7d896-b817-4b0d-8785-aac5d84ef0ba	opt_ab512a31	t	1.00
1f1931b8-3d5b-4428-b0f4-d5e30d18bfdb	8e0f9d97-1212-4bbe-aed7-cbf933820324	["opt_70235033"]	t	1.00
ca997e9b-acdb-423c-a008-b5faeb24d6f5	57c88058-5210-4ed2-bb40-e9ff09415a34	opt_0afdee06	f	0.00
5bedcf2b-c92f-429d-95d2-c316ee256fd1	3013f8bc-c2e6-4e86-a2df-a624c36feac7	opt_80a33b3c	t	1.00
1f1931b8-3d5b-4428-b0f4-d5e30d18bfdb	3013f8bc-c2e6-4e86-a2df-a624c36feac7	opt_80a33b3c	t	1.00
c7ca48e1-e77c-430f-8c24-9d2b49437647	3013f8bc-c2e6-4e86-a2df-a624c36feac7	opt_80a33b3c	t	1.00
6cdb6697-0cc1-424b-a861-88722168dc54	3013f8bc-c2e6-4e86-a2df-a624c36feac7	opt_80a33b3c	t	1.00
5bedcf2b-c92f-429d-95d2-c316ee256fd1	5b927fd8-6faf-4e58-b885-e0bb11bfcab0	opt_fc91ed25	t	1.00
9931b37f-2ae5-4db9-9bac-ecbb8079627d	3013f8bc-c2e6-4e86-a2df-a624c36feac7	opt_80a33b3c	t	1.00
65d884ae-716e-49c1-8121-58f69a917807	3013f8bc-c2e6-4e86-a2df-a624c36feac7	opt_80a33b3c	t	1.00
159182f4-ff10-497c-b0ce-c3adc8d012e0	3013f8bc-c2e6-4e86-a2df-a624c36feac7	opt_ad5dffad	f	0.00
5bedcf2b-c92f-429d-95d2-c316ee256fd1	57c88058-5210-4ed2-bb40-e9ff09415a34	opt_d870fc2d	t	1.00
20ad5f99-4429-4196-834b-e166ac9ea560	3013f8bc-c2e6-4e86-a2df-a624c36feac7	opt_80a33b3c	t	1.00
90622fdf-3569-4585-a4ff-4cba93424d68	3013f8bc-c2e6-4e86-a2df-a624c36feac7	opt_80a33b3c	t	1.00
f4538af3-2ee8-4aa9-b702-2513ce0274f0	3013f8bc-c2e6-4e86-a2df-a624c36feac7	opt_80a33b3c	t	1.00
1f1931b8-3d5b-4428-b0f4-d5e30d18bfdb	5b927fd8-6faf-4e58-b885-e0bb11bfcab0	opt_fc91ed25	t	1.00
ca997e9b-acdb-423c-a008-b5faeb24d6f5	3013f8bc-c2e6-4e86-a2df-a624c36feac7	opt_80a33b3c	t	1.00
1f1931b8-3d5b-4428-b0f4-d5e30d18bfdb	57c88058-5210-4ed2-bb40-e9ff09415a34	opt_d870fc2d	t	1.00
20ad5f99-4429-4196-834b-e166ac9ea560	5b927fd8-6faf-4e58-b885-e0bb11bfcab0	opt_fc91ed25	t	1.00
65d884ae-716e-49c1-8121-58f69a917807	5b927fd8-6faf-4e58-b885-e0bb11bfcab0	opt_fc91ed25	t	1.00
00a7405d-ab37-4399-a40b-7f6b3158de74	5b927fd8-6faf-4e58-b885-e0bb11bfcab0	opt_d340e96e	f	0.00
159182f4-ff10-497c-b0ce-c3adc8d012e0	5b927fd8-6faf-4e58-b885-e0bb11bfcab0	opt_fc91ed25	t	1.00
9931b37f-2ae5-4db9-9bac-ecbb8079627d	5b927fd8-6faf-4e58-b885-e0bb11bfcab0	opt_fc91ed25	t	1.00
90622fdf-3569-4585-a4ff-4cba93424d68	57c88058-5210-4ed2-bb40-e9ff09415a34	opt_ce19a47e	f	0.00
6cdb6697-0cc1-424b-a861-88722168dc54	5b927fd8-6faf-4e58-b885-e0bb11bfcab0	opt_fc91ed25	t	1.00
20ad5f99-4429-4196-834b-e166ac9ea560	57c88058-5210-4ed2-bb40-e9ff09415a34	opt_d870fc2d	t	1.00
65d884ae-716e-49c1-8121-58f69a917807	57c88058-5210-4ed2-bb40-e9ff09415a34	opt_d870fc2d	t	1.00
6522602f-343d-4545-b3b6-64fefe44f3a0	3013f8bc-c2e6-4e86-a2df-a624c36feac7	opt_80a33b3c	t	1.00
6cdb6697-0cc1-424b-a861-88722168dc54	57c88058-5210-4ed2-bb40-e9ff09415a34	opt_d870fc2d	t	1.00
1f1931b8-3d5b-4428-b0f4-d5e30d18bfdb	81adce44-5a09-4c64-960f-6d88e1f9ce8a	["opt_c8df9d8b"]	t	1.00
90622fdf-3569-4585-a4ff-4cba93424d68	5b927fd8-6faf-4e58-b885-e0bb11bfcab0	opt_fc91ed25	t	1.00
00a7405d-ab37-4399-a40b-7f6b3158de74	57c88058-5210-4ed2-bb40-e9ff09415a34	opt_d870fc2d	t	1.00
20ad5f99-4429-4196-834b-e166ac9ea560	a6c19706-467e-466b-ad72-c49fa7f225bc	opt_364577e8	f	0.00
1f1931b8-3d5b-4428-b0f4-d5e30d18bfdb	b3b7d896-b817-4b0d-8785-aac5d84ef0ba	opt_ab512a31	t	1.00
6cdb6697-0cc1-424b-a861-88722168dc54	a6c19706-467e-466b-ad72-c49fa7f225bc	opt_46249571	t	1.00
f4538af3-2ee8-4aa9-b702-2513ce0274f0	5b927fd8-6faf-4e58-b885-e0bb11bfcab0	opt_fc91ed25	t	1.00
9931b37f-2ae5-4db9-9bac-ecbb8079627d	57c88058-5210-4ed2-bb40-e9ff09415a34	opt_d870fc2d	t	1.00
00a7405d-ab37-4399-a40b-7f6b3158de74	a6c19706-467e-466b-ad72-c49fa7f225bc	opt_46249571	t	1.00
159182f4-ff10-497c-b0ce-c3adc8d012e0	57c88058-5210-4ed2-bb40-e9ff09415a34	opt_a16fd6d6	f	0.00
6522602f-343d-4545-b3b6-64fefe44f3a0	57c88058-5210-4ed2-bb40-e9ff09415a34	opt_0afdee06	f	0.00
ca997e9b-acdb-423c-a008-b5faeb24d6f5	a6c19706-467e-466b-ad72-c49fa7f225bc	opt_46249571	t	1.00
6522602f-343d-4545-b3b6-64fefe44f3a0	5b927fd8-6faf-4e58-b885-e0bb11bfcab0	opt_fc91ed25	t	1.00
c7ca48e1-e77c-430f-8c24-9d2b49437647	5b927fd8-6faf-4e58-b885-e0bb11bfcab0	opt_fc91ed25	t	1.00
00a7405d-ab37-4399-a40b-7f6b3158de74	4f104b3d-45ff-42ff-b35f-81cce60262d6	["opt_190c3aa0"]	f	0.00
65d884ae-716e-49c1-8121-58f69a917807	b3b7d896-b817-4b0d-8785-aac5d84ef0ba	opt_ab512a31	t	1.00
1f1931b8-3d5b-4428-b0f4-d5e30d18bfdb	4f104b3d-45ff-42ff-b35f-81cce60262d6	["opt_aca4c601"]	t	1.00
6cdb6697-0cc1-424b-a861-88722168dc54	b3b7d896-b817-4b0d-8785-aac5d84ef0ba	opt_ab512a31	t	1.00
5bedcf2b-c92f-429d-95d2-c316ee256fd1	b3b7d896-b817-4b0d-8785-aac5d84ef0ba	opt_ab512a31	t	1.00
20ad5f99-4429-4196-834b-e166ac9ea560	b3b7d896-b817-4b0d-8785-aac5d84ef0ba	opt_b6999fdf	f	0.00
1f1931b8-3d5b-4428-b0f4-d5e30d18bfdb	6ca03b34-58b6-4ff3-95f7-67b0a116d6b5	["opt_8a9b7c71"]	t	1.00
159182f4-ff10-497c-b0ce-c3adc8d012e0	b3b7d896-b817-4b0d-8785-aac5d84ef0ba	opt_518163b3	f	0.00
90622fdf-3569-4585-a4ff-4cba93424d68	a6c19706-467e-466b-ad72-c49fa7f225bc	opt_46249571	t	1.00
1f1931b8-3d5b-4428-b0f4-d5e30d18bfdb	2854a144-028b-40ce-8643-2e5d848fe940	["opt_4bd39374"]	t	1.00
f4538af3-2ee8-4aa9-b702-2513ce0274f0	a6c19706-467e-466b-ad72-c49fa7f225bc	opt_46249571	t	1.00
6522602f-343d-4545-b3b6-64fefe44f3a0	a6c19706-467e-466b-ad72-c49fa7f225bc	opt_364577e8	f	0.00
c7ca48e1-e77c-430f-8c24-9d2b49437647	57c88058-5210-4ed2-bb40-e9ff09415a34	opt_a16fd6d6	f	0.00
6cdb6697-0cc1-424b-a861-88722168dc54	4f104b3d-45ff-42ff-b35f-81cce60262d6	["opt_aca4c601"]	t	1.00
1f1931b8-3d5b-4428-b0f4-d5e30d18bfdb	f44e2f83-0626-48a5-8e9e-f62275146c71	opt_false	t	1.00
1f1931b8-3d5b-4428-b0f4-d5e30d18bfdb	607358c1-d40b-4898-9fa2-be00b1f416f6	opt_true	t	1.00
00a7405d-ab37-4399-a40b-7f6b3158de74	8e0f9d97-1212-4bbe-aed7-cbf933820324	["opt_4bd39374"]	f	0.00
20ad5f99-4429-4196-834b-e166ac9ea560	4f104b3d-45ff-42ff-b35f-81cce60262d6	["opt_aca4c601"]	t	1.00
1f1931b8-3d5b-4428-b0f4-d5e30d18bfdb	87f762be-3f3b-44f8-bb67-c15feea21677	opt_false	t	1.00
65d884ae-716e-49c1-8121-58f69a917807	8e0f9d97-1212-4bbe-aed7-cbf933820324	["opt_70235033"]	t	1.00
6cdb6697-0cc1-424b-a861-88722168dc54	8e0f9d97-1212-4bbe-aed7-cbf933820324	["opt_70235033"]	t	1.00
90622fdf-3569-4585-a4ff-4cba93424d68	b3b7d896-b817-4b0d-8785-aac5d84ef0ba	opt_b6999fdf	f	0.00
6522602f-343d-4545-b3b6-64fefe44f3a0	b3b7d896-b817-4b0d-8785-aac5d84ef0ba	opt_ab512a31	t	1.00
00a7405d-ab37-4399-a40b-7f6b3158de74	81adce44-5a09-4c64-960f-6d88e1f9ce8a	["opt_aca4c601"]	f	0.00
ca997e9b-acdb-423c-a008-b5faeb24d6f5	b3b7d896-b817-4b0d-8785-aac5d84ef0ba	opt_b6999fdf	f	0.00
00a7405d-ab37-4399-a40b-7f6b3158de74	6ca03b34-58b6-4ff3-95f7-67b0a116d6b5	["opt_8a9b7c71"]	t	1.00
20ad5f99-4429-4196-834b-e166ac9ea560	8e0f9d97-1212-4bbe-aed7-cbf933820324	["opt_c8df9d8b"]	f	0.00
c7ca48e1-e77c-430f-8c24-9d2b49437647	a6c19706-467e-466b-ad72-c49fa7f225bc	opt_364577e8	f	0.00
1f1931b8-3d5b-4428-b0f4-d5e30d18bfdb	a4ac9d05-a71d-425e-93e9-48280eb0424d	opt_false	f	0.00
159182f4-ff10-497c-b0ce-c3adc8d012e0	4f104b3d-45ff-42ff-b35f-81cce60262d6	["opt_aca4c601"]	t	1.00
f4538af3-2ee8-4aa9-b702-2513ce0274f0	4f104b3d-45ff-42ff-b35f-81cce60262d6	["opt_aca4c601"]	t	1.00
65d884ae-716e-49c1-8121-58f69a917807	6ca03b34-58b6-4ff3-95f7-67b0a116d6b5	["opt_8a9b7c71"]	t	1.00
159182f4-ff10-497c-b0ce-c3adc8d012e0	8e0f9d97-1212-4bbe-aed7-cbf933820324	["opt_b9465172"]	f	0.00
c7ca48e1-e77c-430f-8c24-9d2b49437647	b3b7d896-b817-4b0d-8785-aac5d84ef0ba	opt_ab512a31	t	1.00
9931b37f-2ae5-4db9-9bac-ecbb8079627d	8e0f9d97-1212-4bbe-aed7-cbf933820324	["opt_70235033"]	t	1.00
5bedcf2b-c92f-429d-95d2-c316ee256fd1	6ca03b34-58b6-4ff3-95f7-67b0a116d6b5	["opt_8a9b7c71"]	t	1.00
6cdb6697-0cc1-424b-a861-88722168dc54	81adce44-5a09-4c64-960f-6d88e1f9ce8a	["opt_c8df9d8b"]	t	1.00
159182f4-ff10-497c-b0ce-c3adc8d012e0	81adce44-5a09-4c64-960f-6d88e1f9ce8a	["opt_190c3aa0"]	f	0.00
6cdb6697-0cc1-424b-a861-88722168dc54	6ca03b34-58b6-4ff3-95f7-67b0a116d6b5	["opt_8a9b7c71"]	t	1.00
f4538af3-2ee8-4aa9-b702-2513ce0274f0	8e0f9d97-1212-4bbe-aed7-cbf933820324	["opt_70235033"]	t	1.00
5bedcf2b-c92f-429d-95d2-c316ee256fd1	81adce44-5a09-4c64-960f-6d88e1f9ce8a	["opt_c8df9d8b"]	t	1.00
65d884ae-716e-49c1-8121-58f69a917807	5a52b49e-c2c0-40ba-b111-f52c6dd3214a	opt_true	t	1.00
f4538af3-2ee8-4aa9-b702-2513ce0274f0	57c88058-5210-4ed2-bb40-e9ff09415a34	opt_d870fc2d	t	1.00
f4538af3-2ee8-4aa9-b702-2513ce0274f0	b3b7d896-b817-4b0d-8785-aac5d84ef0ba	opt_ab512a31	t	1.00
ca997e9b-acdb-423c-a008-b5faeb24d6f5	5b927fd8-6faf-4e58-b885-e0bb11bfcab0	opt_fc91ed25	t	1.00
1f1931b8-3d5b-4428-b0f4-d5e30d18bfdb	5a52b49e-c2c0-40ba-b111-f52c6dd3214a	opt_true	t	1.00
00a7405d-ab37-4399-a40b-7f6b3158de74	3013f8bc-c2e6-4e86-a2df-a624c36feac7	opt_9a8bc4bb	f	0.00
1f1931b8-3d5b-4428-b0f4-d5e30d18bfdb	a6c19706-467e-466b-ad72-c49fa7f225bc	opt_46249571	t	1.00
ca997e9b-acdb-423c-a008-b5faeb24d6f5	4f104b3d-45ff-42ff-b35f-81cce60262d6	["opt_4bd39374"]	f	0.00
6cdb6697-0cc1-424b-a861-88722168dc54	2854a144-028b-40ce-8643-2e5d848fe940	["opt_4bd39374"]	t	1.00
5bedcf2b-c92f-429d-95d2-c316ee256fd1	8e0f9d97-1212-4bbe-aed7-cbf933820324	["opt_70235033"]	t	1.00
65d884ae-716e-49c1-8121-58f69a917807	f44e2f83-0626-48a5-8e9e-f62275146c71	opt_false	t	1.00
65d884ae-716e-49c1-8121-58f69a917807	607358c1-d40b-4898-9fa2-be00b1f416f6	opt_true	t	1.00
65d884ae-716e-49c1-8121-58f69a917807	87f762be-3f3b-44f8-bb67-c15feea21677	opt_false	t	1.00
5bedcf2b-c92f-429d-95d2-c316ee256fd1	4f104b3d-45ff-42ff-b35f-81cce60262d6	["opt_aca4c601"]	t	1.00
5bedcf2b-c92f-429d-95d2-c316ee256fd1	1da1d0d6-5896-4e7f-9ae8-ddb8c2c8e172	{"opt_d8f8b832":"opt_054912bb","opt_9ae5d99f":"opt_6286bbd1","opt_e7c6a6da":"opt_df36da1a","opt_b5dca964":"opt_bfb9d3c2","opt_f18a4d42":"opt_0cd91b32"}	t	5.00
20ad5f99-4429-4196-834b-e166ac9ea560	81adce44-5a09-4c64-960f-6d88e1f9ce8a	["opt_8a9b7c71"]	f	0.00
00a7405d-ab37-4399-a40b-7f6b3158de74	2854a144-028b-40ce-8643-2e5d848fe940	["opt_b9465172"]	f	0.00
6522602f-343d-4545-b3b6-64fefe44f3a0	607358c1-d40b-4898-9fa2-be00b1f416f6	opt_true	t	1.00
6cdb6697-0cc1-424b-a861-88722168dc54	1da1d0d6-5896-4e7f-9ae8-ddb8c2c8e172	{"opt_e7c6a6da":"opt_df36da1a","opt_d8f8b832":"opt_054912bb","opt_f18a4d42":"opt_0cd91b32","opt_b5dca964":"opt_bfb9d3c2","opt_9ae5d99f":"opt_6286bbd1"}	t	5.00
5bedcf2b-c92f-429d-95d2-c316ee256fd1	2854a144-028b-40ce-8643-2e5d848fe940	["opt_4bd39374"]	t	1.00
5bedcf2b-c92f-429d-95d2-c316ee256fd1	5a52b49e-c2c0-40ba-b111-f52c6dd3214a	opt_true	t	1.00
6cdb6697-0cc1-424b-a861-88722168dc54	5a52b49e-c2c0-40ba-b111-f52c6dd3214a	opt_true	t	1.00
159182f4-ff10-497c-b0ce-c3adc8d012e0	5a52b49e-c2c0-40ba-b111-f52c6dd3214a	opt_true	t	1.00
20ad5f99-4429-4196-834b-e166ac9ea560	6ca03b34-58b6-4ff3-95f7-67b0a116d6b5	["opt_4bd39374"]	f	0.00
90622fdf-3569-4585-a4ff-4cba93424d68	4f104b3d-45ff-42ff-b35f-81cce60262d6	["opt_aca4c601"]	t	1.00
5bedcf2b-c92f-429d-95d2-c316ee256fd1	f44e2f83-0626-48a5-8e9e-f62275146c71	opt_false	t	1.00
159182f4-ff10-497c-b0ce-c3adc8d012e0	f44e2f83-0626-48a5-8e9e-f62275146c71	opt_false	t	1.00
c7ca48e1-e77c-430f-8c24-9d2b49437647	4f104b3d-45ff-42ff-b35f-81cce60262d6	["opt_aca4c601"]	t	1.00
6522602f-343d-4545-b3b6-64fefe44f3a0	4f104b3d-45ff-42ff-b35f-81cce60262d6	["opt_aca4c601"]	t	1.00
5bedcf2b-c92f-429d-95d2-c316ee256fd1	607358c1-d40b-4898-9fa2-be00b1f416f6	opt_true	t	1.00
9931b37f-2ae5-4db9-9bac-ecbb8079627d	f44e2f83-0626-48a5-8e9e-f62275146c71	opt_false	t	1.00
6cdb6697-0cc1-424b-a861-88722168dc54	f44e2f83-0626-48a5-8e9e-f62275146c71	opt_false	t	1.00
9931b37f-2ae5-4db9-9bac-ecbb8079627d	6ca03b34-58b6-4ff3-95f7-67b0a116d6b5	["opt_8a9b7c71"]	t	1.00
159182f4-ff10-497c-b0ce-c3adc8d012e0	607358c1-d40b-4898-9fa2-be00b1f416f6	opt_true	t	1.00
c7ca48e1-e77c-430f-8c24-9d2b49437647	5a52b49e-c2c0-40ba-b111-f52c6dd3214a	opt_false	f	0.00
6cdb6697-0cc1-424b-a861-88722168dc54	607358c1-d40b-4898-9fa2-be00b1f416f6	opt_true	t	1.00
9931b37f-2ae5-4db9-9bac-ecbb8079627d	607358c1-d40b-4898-9fa2-be00b1f416f6	opt_true	t	1.00
c7ca48e1-e77c-430f-8c24-9d2b49437647	8e0f9d97-1212-4bbe-aed7-cbf933820324	["opt_70235033"]	t	1.00
6cdb6697-0cc1-424b-a861-88722168dc54	87f762be-3f3b-44f8-bb67-c15feea21677	opt_false	t	1.00
20ad5f99-4429-4196-834b-e166ac9ea560	2854a144-028b-40ce-8643-2e5d848fe940	["opt_70235033"]	f	0.00
159182f4-ff10-497c-b0ce-c3adc8d012e0	87f762be-3f3b-44f8-bb67-c15feea21677	opt_false	t	1.00
6522602f-343d-4545-b3b6-64fefe44f3a0	8e0f9d97-1212-4bbe-aed7-cbf933820324	["opt_70235033"]	t	1.00
f4538af3-2ee8-4aa9-b702-2513ce0274f0	6ca03b34-58b6-4ff3-95f7-67b0a116d6b5	["opt_4bd39374"]	f	0.00
159182f4-ff10-497c-b0ce-c3adc8d012e0	a4ac9d05-a71d-425e-93e9-48280eb0424d	opt_true	t	1.00
ca997e9b-acdb-423c-a008-b5faeb24d6f5	8e0f9d97-1212-4bbe-aed7-cbf933820324	["opt_b9465172"]	f	0.00
f4538af3-2ee8-4aa9-b702-2513ce0274f0	2854a144-028b-40ce-8643-2e5d848fe940	["opt_190c3aa0"]	f	0.00
6522602f-343d-4545-b3b6-64fefe44f3a0	81adce44-5a09-4c64-960f-6d88e1f9ce8a	["opt_c8df9d8b"]	t	1.00
20ad5f99-4429-4196-834b-e166ac9ea560	5a52b49e-c2c0-40ba-b111-f52c6dd3214a	opt_false	f	0.00
65d884ae-716e-49c1-8121-58f69a917807	1da1d0d6-5896-4e7f-9ae8-ddb8c2c8e172	{"opt_b5dca964":"opt_0cd91b32","opt_d8f8b832":"opt_054912bb","opt_e7c6a6da":"opt_df36da1a","opt_f18a4d42":"opt_6286bbd1","opt_9ae5d99f":"opt_bfb9d3c2"}	f	2.00
20ad5f99-4429-4196-834b-e166ac9ea560	f44e2f83-0626-48a5-8e9e-f62275146c71	opt_false	t	1.00
f4538af3-2ee8-4aa9-b702-2513ce0274f0	f44e2f83-0626-48a5-8e9e-f62275146c71	opt_false	t	1.00
6522602f-343d-4545-b3b6-64fefe44f3a0	6ca03b34-58b6-4ff3-95f7-67b0a116d6b5	["opt_8a9b7c71"]	t	1.00
20ad5f99-4429-4196-834b-e166ac9ea560	607358c1-d40b-4898-9fa2-be00b1f416f6	opt_true	t	1.00
00a7405d-ab37-4399-a40b-7f6b3158de74	5a52b49e-c2c0-40ba-b111-f52c6dd3214a	opt_false	f	0.00
f4538af3-2ee8-4aa9-b702-2513ce0274f0	607358c1-d40b-4898-9fa2-be00b1f416f6	opt_true	t	1.00
65d884ae-716e-49c1-8121-58f69a917807	81adce44-5a09-4c64-960f-6d88e1f9ce8a	["opt_c8df9d8b"]	t	1.00
20ad5f99-4429-4196-834b-e166ac9ea560	87f762be-3f3b-44f8-bb67-c15feea21677	opt_false	t	1.00
ca997e9b-acdb-423c-a008-b5faeb24d6f5	81adce44-5a09-4c64-960f-6d88e1f9ce8a	["opt_c8df9d8b"]	t	1.00
6522602f-343d-4545-b3b6-64fefe44f3a0	87f762be-3f3b-44f8-bb67-c15feea21677	opt_false	t	1.00
6522602f-343d-4545-b3b6-64fefe44f3a0	2854a144-028b-40ce-8643-2e5d848fe940	["opt_4bd39374"]	t	1.00
20ad5f99-4429-4196-834b-e166ac9ea560	a4ac9d05-a71d-425e-93e9-48280eb0424d	opt_true	t	1.00
00a7405d-ab37-4399-a40b-7f6b3158de74	f44e2f83-0626-48a5-8e9e-f62275146c71	opt_false	t	1.00
00a7405d-ab37-4399-a40b-7f6b3158de74	607358c1-d40b-4898-9fa2-be00b1f416f6	opt_true	t	1.00
6522602f-343d-4545-b3b6-64fefe44f3a0	5a52b49e-c2c0-40ba-b111-f52c6dd3214a	opt_true	t	1.00
ca997e9b-acdb-423c-a008-b5faeb24d6f5	6ca03b34-58b6-4ff3-95f7-67b0a116d6b5	["opt_8a9b7c71"]	t	1.00
159182f4-ff10-497c-b0ce-c3adc8d012e0	1da1d0d6-5896-4e7f-9ae8-ddb8c2c8e172	{"opt_b5dca964":"opt_bfb9d3c2","opt_e7c6a6da":"opt_df36da1a","opt_f18a4d42":"opt_6286bbd1","opt_9ae5d99f":"opt_0cd91b32","opt_d8f8b832":"opt_054912bb"}	f	3.00
6522602f-343d-4545-b3b6-64fefe44f3a0	f44e2f83-0626-48a5-8e9e-f62275146c71	opt_false	t	1.00
00a7405d-ab37-4399-a40b-7f6b3158de74	87f762be-3f3b-44f8-bb67-c15feea21677	opt_true	f	0.00
6cdb6697-0cc1-424b-a861-88722168dc54	a4ac9d05-a71d-425e-93e9-48280eb0424d	opt_true	t	1.00
65d884ae-716e-49c1-8121-58f69a917807	a6c19706-467e-466b-ad72-c49fa7f225bc	opt_9f2d381e	f	0.00
ca997e9b-acdb-423c-a008-b5faeb24d6f5	2854a144-028b-40ce-8643-2e5d848fe940	["opt_aca4c601"]	f	0.00
1f1931b8-3d5b-4428-b0f4-d5e30d18bfdb	1da1d0d6-5896-4e7f-9ae8-ddb8c2c8e172	{"opt_d8f8b832":"opt_054912bb","opt_e7c6a6da":"opt_df36da1a","opt_9ae5d99f":"opt_6286bbd1","opt_f18a4d42":"opt_0cd91b32","opt_b5dca964":"opt_bfb9d3c2"}	t	5.00
c7ca48e1-e77c-430f-8c24-9d2b49437647	2854a144-028b-40ce-8643-2e5d848fe940	["opt_b9465172"]	f	0.00
6522602f-343d-4545-b3b6-64fefe44f3a0	a4ac9d05-a71d-425e-93e9-48280eb0424d	opt_false	f	0.00
f4538af3-2ee8-4aa9-b702-2513ce0274f0	1da1d0d6-5896-4e7f-9ae8-ddb8c2c8e172	{"opt_d8f8b832":"opt_054912bb","opt_e7c6a6da":"opt_df36da1a","opt_b5dca964":"opt_bfb9d3c2","opt_f18a4d42":"opt_0cd91b32","opt_9ae5d99f":"opt_6286bbd1"}	t	5.00
159182f4-ff10-497c-b0ce-c3adc8d012e0	2854a144-028b-40ce-8643-2e5d848fe940	["opt_70235033"]	f	0.00
f4538af3-2ee8-4aa9-b702-2513ce0274f0	81adce44-5a09-4c64-960f-6d88e1f9ce8a	["opt_c8df9d8b"]	t	1.00
ca997e9b-acdb-423c-a008-b5faeb24d6f5	5a52b49e-c2c0-40ba-b111-f52c6dd3214a	opt_false	f	0.00
65d884ae-716e-49c1-8121-58f69a917807	4f104b3d-45ff-42ff-b35f-81cce60262d6	["opt_aca4c601"]	t	1.00
90622fdf-3569-4585-a4ff-4cba93424d68	8e0f9d97-1212-4bbe-aed7-cbf933820324	["opt_c8df9d8b"]	f	0.00
c7ca48e1-e77c-430f-8c24-9d2b49437647	6ca03b34-58b6-4ff3-95f7-67b0a116d6b5	["opt_8a9b7c71"]	t	1.00
ca997e9b-acdb-423c-a008-b5faeb24d6f5	f44e2f83-0626-48a5-8e9e-f62275146c71	opt_false	t	1.00
9931b37f-2ae5-4db9-9bac-ecbb8079627d	4f104b3d-45ff-42ff-b35f-81cce60262d6	["opt_aca4c601"]	t	1.00
ca997e9b-acdb-423c-a008-b5faeb24d6f5	607358c1-d40b-4898-9fa2-be00b1f416f6	opt_true	t	1.00
6522602f-343d-4545-b3b6-64fefe44f3a0	1da1d0d6-5896-4e7f-9ae8-ddb8c2c8e172	{"opt_f18a4d42":"opt_0cd91b32","opt_d8f8b832":"opt_054912bb","opt_e7c6a6da":"opt_df36da1a","opt_9ae5d99f":"opt_6286bbd1","opt_b5dca964":"opt_bfb9d3c2"}	t	5.00
00a7405d-ab37-4399-a40b-7f6b3158de74	1da1d0d6-5896-4e7f-9ae8-ddb8c2c8e172	{"opt_b5dca964":"opt_0cd91b32","opt_9ae5d99f":"opt_6286bbd1","opt_e7c6a6da":"opt_df36da1a","opt_f18a4d42":"opt_bfb9d3c2","opt_d8f8b832":"opt_054912bb"}	f	3.00
c7ca48e1-e77c-430f-8c24-9d2b49437647	81adce44-5a09-4c64-960f-6d88e1f9ce8a	["opt_c8df9d8b"]	t	1.00
00a7405d-ab37-4399-a40b-7f6b3158de74	a4ac9d05-a71d-425e-93e9-48280eb0424d	opt_false	f	0.00
159182f4-ff10-497c-b0ce-c3adc8d012e0	6ca03b34-58b6-4ff3-95f7-67b0a116d6b5	["opt_8a9b7c71"]	t	1.00
fd91991a-2f5c-4a8d-b12d-f183d6f7925e	ece85ffd-57f4-462f-955c-f314b9c7ea3c	MID	t	1.00
2e568f7d-b4d1-4ff1-bdec-f67ea61c70bb	529ae2ad-c7dd-483c-be8d-449d7ddab0c9	["Formula Bar / ফর্মুলা বার"]	f	0.00
a6c77b0d-2939-4b6b-af4a-32e1c592d903	ece85ffd-57f4-462f-955c-f314b9c7ea3c	BETWEEN	f	0.00
65d884ae-716e-49c1-8121-58f69a917807	2854a144-028b-40ce-8643-2e5d848fe940	["opt_4bd39374"]	t	1.00
9931b37f-2ae5-4db9-9bac-ecbb8079627d	b3b7d896-b817-4b0d-8785-aac5d84ef0ba	opt_ab512a31	t	1.00
ca997e9b-acdb-423c-a008-b5faeb24d6f5	87f762be-3f3b-44f8-bb67-c15feea21677	opt_true	f	0.00
ca997e9b-acdb-423c-a008-b5faeb24d6f5	a4ac9d05-a71d-425e-93e9-48280eb0424d	opt_false	f	0.00
c7ca48e1-e77c-430f-8c24-9d2b49437647	f44e2f83-0626-48a5-8e9e-f62275146c71	opt_false	t	1.00
f4538af3-2ee8-4aa9-b702-2513ce0274f0	a4ac9d05-a71d-425e-93e9-48280eb0424d	opt_true	t	1.00
5bedcf2b-c92f-429d-95d2-c316ee256fd1	87f762be-3f3b-44f8-bb67-c15feea21677	opt_false	t	1.00
65d884ae-716e-49c1-8121-58f69a917807	a4ac9d05-a71d-425e-93e9-48280eb0424d	opt_false	f	0.00
986ed183-9244-4b47-a0e7-b5260db0faec	5833849f-e021-4927-bace-bc24f886f3e3	INDI	t	1.00
90622fdf-3569-4585-a4ff-4cba93424d68	81adce44-5a09-4c64-960f-6d88e1f9ce8a	["opt_b9465172"]	f	0.00
722cf1a8-1f40-40e8-9092-54139aa2640d	5833849f-e021-4927-bace-bc24f886f3e3	INDI	t	1.00
c7ca48e1-e77c-430f-8c24-9d2b49437647	607358c1-d40b-4898-9fa2-be00b1f416f6	opt_true	t	1.00
c7ca48e1-e77c-430f-8c24-9d2b49437647	1da1d0d6-5896-4e7f-9ae8-ddb8c2c8e172	{"opt_d8f8b832":"opt_054912bb","opt_e7c6a6da":"opt_df36da1a","opt_9ae5d99f":"opt_6286bbd1","opt_b5dca964":"opt_0cd91b32","opt_f18a4d42":"opt_bfb9d3c2"}	f	3.00
9931b37f-2ae5-4db9-9bac-ecbb8079627d	2854a144-028b-40ce-8643-2e5d848fe940	["opt_4bd39374"]	t	1.00
2e568f7d-b4d1-4ff1-bdec-f67ea61c70bb	5833849f-e021-4927-bace-bc24f886f3e3	NDIA	f	0.00
90622fdf-3569-4585-a4ff-4cba93424d68	6ca03b34-58b6-4ff3-95f7-67b0a116d6b5	["opt_4bd39374"]	f	0.00
f4538af3-2ee8-4aa9-b702-2513ce0274f0	87f762be-3f3b-44f8-bb67-c15feea21677	opt_false	t	1.00
c7ca48e1-e77c-430f-8c24-9d2b49437647	a4ac9d05-a71d-425e-93e9-48280eb0424d	opt_false	f	0.00
9931b37f-2ae5-4db9-9bac-ecbb8079627d	81adce44-5a09-4c64-960f-6d88e1f9ce8a	["opt_c8df9d8b"]	t	1.00
9931b37f-2ae5-4db9-9bac-ecbb8079627d	1da1d0d6-5896-4e7f-9ae8-ddb8c2c8e172	{"opt_d8f8b832":"opt_054912bb","opt_b5dca964":"opt_bfb9d3c2","opt_f18a4d42":"opt_0cd91b32","opt_e7c6a6da":"opt_df36da1a","opt_9ae5d99f":"opt_6286bbd1"}	t	5.00
c7ca48e1-e77c-430f-8c24-9d2b49437647	87f762be-3f3b-44f8-bb67-c15feea21677	opt_false	t	1.00
ca997e9b-acdb-423c-a008-b5faeb24d6f5	1da1d0d6-5896-4e7f-9ae8-ddb8c2c8e172	{"opt_e7c6a6da":"opt_df36da1a","opt_f18a4d42":"opt_bfb9d3c2","opt_9ae5d99f":"opt_054912bb","opt_d8f8b832":"opt_6286bbd1","opt_b5dca964":"opt_0cd91b32"}	f	1.00
90622fdf-3569-4585-a4ff-4cba93424d68	2854a144-028b-40ce-8643-2e5d848fe940	["opt_8a9b7c71"]	f	0.00
9931b37f-2ae5-4db9-9bac-ecbb8079627d	87f762be-3f3b-44f8-bb67-c15feea21677	opt_false	t	1.00
90622fdf-3569-4585-a4ff-4cba93424d68	5a52b49e-c2c0-40ba-b111-f52c6dd3214a	opt_false	f	0.00
9931b37f-2ae5-4db9-9bac-ecbb8079627d	5a52b49e-c2c0-40ba-b111-f52c6dd3214a	opt_true	t	1.00
fd91991a-2f5c-4a8d-b12d-f183d6f7925e	5833849f-e021-4927-bace-bc24f886f3e3	IND	f	0.00
9931b37f-2ae5-4db9-9bac-ecbb8079627d	a4ac9d05-a71d-425e-93e9-48280eb0424d	opt_false	f	0.00
8496b17b-6c20-49fe-8c07-fa91b30588b8	5833849f-e021-4927-bace-bc24f886f3e3	INDI	t	1.00
90622fdf-3569-4585-a4ff-4cba93424d68	f44e2f83-0626-48a5-8e9e-f62275146c71	opt_false	t	1.00
2e568f7d-b4d1-4ff1-bdec-f67ea61c70bb	0fde9b9b-a7dc-4c9d-96c4-6c48a135e0bb	Column	f	0.00
90622fdf-3569-4585-a4ff-4cba93424d68	607358c1-d40b-4898-9fa2-be00b1f416f6	opt_true	t	1.00
90622fdf-3569-4585-a4ff-4cba93424d68	1da1d0d6-5896-4e7f-9ae8-ddb8c2c8e172	{"opt_d8f8b832":"opt_054912bb","opt_f18a4d42":"opt_0cd91b32","opt_b5dca964":"opt_bfb9d3c2","opt_e7c6a6da":"opt_df36da1a","opt_9ae5d99f":"opt_6286bbd1"}	t	5.00
20ad5f99-4429-4196-834b-e166ac9ea560	1da1d0d6-5896-4e7f-9ae8-ddb8c2c8e172	{"opt_b5dca964":"opt_0cd91b32","opt_f18a4d42":"opt_bfb9d3c2","opt_e7c6a6da":"opt_df36da1a","opt_d8f8b832":"opt_054912bb","opt_9ae5d99f":"opt_6286bbd1"}	f	3.00
90622fdf-3569-4585-a4ff-4cba93424d68	87f762be-3f3b-44f8-bb67-c15feea21677	opt_false	t	1.00
90622fdf-3569-4585-a4ff-4cba93424d68	a4ac9d05-a71d-425e-93e9-48280eb0424d	opt_false	f	0.00
f4538af3-2ee8-4aa9-b702-2513ce0274f0	5a52b49e-c2c0-40ba-b111-f52c6dd3214a	opt_true	t	1.00
722cf1a8-1f40-40e8-9092-54139aa2640d	0fde9b9b-a7dc-4c9d-96c4-6c48a135e0bb	Row	t	1.00
2e568f7d-b4d1-4ff1-bdec-f67ea61c70bb	c2b4b7f2-9fb8-4d30-b9de-017d8c5ba2de	Numbers	t	1.00
5bedcf2b-c92f-429d-95d2-c316ee256fd1	a4ac9d05-a71d-425e-93e9-48280eb0424d	opt_true	t	1.00
0ad9048b-f36f-4569-9c69-477db25385f4	5833849f-e021-4927-bace-bc24f886f3e3	INDI	t	1.00
a6c77b0d-2939-4b6b-af4a-32e1c592d903	5833849f-e021-4927-bace-bc24f886f3e3	IND	f	0.00
5bedcf2b-c92f-429d-95d2-c316ee256fd1	a6c19706-467e-466b-ad72-c49fa7f225bc	opt_9f2d381e	f	0.00
9931b37f-2ae5-4db9-9bac-ecbb8079627d	a6c19706-467e-466b-ad72-c49fa7f225bc	opt_9f2d381e	f	0.00
8496b17b-6c20-49fe-8c07-fa91b30588b8	0fde9b9b-a7dc-4c9d-96c4-6c48a135e0bb	Row	t	1.00
2e568f7d-b4d1-4ff1-bdec-f67ea61c70bb	13a091e7-a5e6-405c-a48c-c4129bc683d3	=	t	1.00
2e568f7d-b4d1-4ff1-bdec-f67ea61c70bb	029fc3b0-9c48-4fbb-9677-af33e7277f18	MAX	t	1.00
722cf1a8-1f40-40e8-9092-54139aa2640d	c2b4b7f2-9fb8-4d30-b9de-017d8c5ba2de	Text	f	0.00
0ad9048b-f36f-4569-9c69-477db25385f4	0fde9b9b-a7dc-4c9d-96c4-6c48a135e0bb	Row	t	1.00
722cf1a8-1f40-40e8-9092-54139aa2640d	13a091e7-a5e6-405c-a48c-c4129bc683d3	=	t	1.00
d756ce60-c4ab-4b4c-a680-003d1497e4a1	0fde9b9b-a7dc-4c9d-96c4-6c48a135e0bb	Row	t	1.00
8496b17b-6c20-49fe-8c07-fa91b30588b8	c2b4b7f2-9fb8-4d30-b9de-017d8c5ba2de	Numbers	t	1.00
fd91991a-2f5c-4a8d-b12d-f183d6f7925e	0fde9b9b-a7dc-4c9d-96c4-6c48a135e0bb	Row	t	1.00
a6c77b0d-2939-4b6b-af4a-32e1c592d903	0fde9b9b-a7dc-4c9d-96c4-6c48a135e0bb	Row	t	1.00
722cf1a8-1f40-40e8-9092-54139aa2640d	029fc3b0-9c48-4fbb-9677-af33e7277f18	MAX	t	1.00
8496b17b-6c20-49fe-8c07-fa91b30588b8	13a091e7-a5e6-405c-a48c-c4129bc683d3	=	t	1.00
4344b05c-dda8-416d-bded-2516e9fa210c	5833849f-e021-4927-bace-bc24f886f3e3	INDI	t	1.00
0ad9048b-f36f-4569-9c69-477db25385f4	c2b4b7f2-9fb8-4d30-b9de-017d8c5ba2de	Numbers	t	1.00
8496b17b-6c20-49fe-8c07-fa91b30588b8	029fc3b0-9c48-4fbb-9677-af33e7277f18	MAX	t	1.00
2e568f7d-b4d1-4ff1-bdec-f67ea61c70bb	298955cb-e6db-47fc-9cab-eed36da79791	IF	t	1.00
986ed183-9244-4b47-a0e7-b5260db0faec	0fde9b9b-a7dc-4c9d-96c4-6c48a135e0bb	Row	t	1.00
0ad9048b-f36f-4569-9c69-477db25385f4	13a091e7-a5e6-405c-a48c-c4129bc683d3	=	t	1.00
722cf1a8-1f40-40e8-9092-54139aa2640d	35dff853-36c5-4f24-b54a-f49f2c1322f9	Fill Series	f	0.00
d756ce60-c4ab-4b4c-a680-003d1497e4a1	c2b4b7f2-9fb8-4d30-b9de-017d8c5ba2de	Numbers	t	1.00
8496b17b-6c20-49fe-8c07-fa91b30588b8	298955cb-e6db-47fc-9cab-eed36da79791	IF	t	1.00
2e568f7d-b4d1-4ff1-bdec-f67ea61c70bb	470e201b-9ddc-4738-a700-f8147ddb2a49	Table	f	0.00
0ad9048b-f36f-4569-9c69-477db25385f4	029fc3b0-9c48-4fbb-9677-af33e7277f18	MAX	t	1.00
8496b17b-6c20-49fe-8c07-fa91b30588b8	470e201b-9ddc-4738-a700-f8147ddb2a49	Cell	t	1.00
d756ce60-c4ab-4b4c-a680-003d1497e4a1	13a091e7-a5e6-405c-a48c-c4129bc683d3	=	t	1.00
2e568f7d-b4d1-4ff1-bdec-f67ea61c70bb	ec445dac-554e-42f1-9f2b-56e66908bbe3	NOW	t	1.00
4344b05c-dda8-416d-bded-2516e9fa210c	0fde9b9b-a7dc-4c9d-96c4-6c48a135e0bb	Row	t	1.00
986ed183-9244-4b47-a0e7-b5260db0faec	c2b4b7f2-9fb8-4d30-b9de-017d8c5ba2de	Numbers	t	1.00
d756ce60-c4ab-4b4c-a680-003d1497e4a1	029fc3b0-9c48-4fbb-9677-af33e7277f18	MAX	t	1.00
2e568f7d-b4d1-4ff1-bdec-f67ea61c70bb	ece85ffd-57f4-462f-955c-f314b9c7ea3c	MID	t	1.00
986ed183-9244-4b47-a0e7-b5260db0faec	13a091e7-a5e6-405c-a48c-c4129bc683d3	=	t	1.00
fd91991a-2f5c-4a8d-b12d-f183d6f7925e	13a091e7-a5e6-405c-a48c-c4129bc683d3	=	t	1.00
8496b17b-6c20-49fe-8c07-fa91b30588b8	ec445dac-554e-42f1-9f2b-56e66908bbe3	DATE	f	0.00
4344b05c-dda8-416d-bded-2516e9fa210c	c2b4b7f2-9fb8-4d30-b9de-017d8c5ba2de	Numbers	t	1.00
722cf1a8-1f40-40e8-9092-54139aa2640d	298955cb-e6db-47fc-9cab-eed36da79791	IF	t	1.00
722cf1a8-1f40-40e8-9092-54139aa2640d	470e201b-9ddc-4738-a700-f8147ddb2a49	Cell	t	1.00
986ed183-9244-4b47-a0e7-b5260db0faec	029fc3b0-9c48-4fbb-9677-af33e7277f18	MAX	t	1.00
a6c77b0d-2939-4b6b-af4a-32e1c592d903	c2b4b7f2-9fb8-4d30-b9de-017d8c5ba2de	Numbers	t	1.00
8496b17b-6c20-49fe-8c07-fa91b30588b8	ece85ffd-57f4-462f-955c-f314b9c7ea3c	MID	t	1.00
4344b05c-dda8-416d-bded-2516e9fa210c	13a091e7-a5e6-405c-a48c-c4129bc683d3	=	t	1.00
fd91991a-2f5c-4a8d-b12d-f183d6f7925e	029fc3b0-9c48-4fbb-9677-af33e7277f18	MAX	t	1.00
46a7e7a3-4f11-4d01-909b-1d0e06595da7	c2b4b7f2-9fb8-4d30-b9de-017d8c5ba2de	Numbers	t	1.00
9e2f8337-9cd8-4506-b4d0-fc622fe06ca7	0fde9b9b-a7dc-4c9d-96c4-6c48a135e0bb	Row	t	1.00
a6c77b0d-2939-4b6b-af4a-32e1c592d903	13a091e7-a5e6-405c-a48c-c4129bc683d3	=	t	1.00
986ed183-9244-4b47-a0e7-b5260db0faec	35dff853-36c5-4f24-b54a-f49f2c1322f9	Fill Formatting Only	t	1.00
a6c77b0d-2939-4b6b-af4a-32e1c592d903	029fc3b0-9c48-4fbb-9677-af33e7277f18	MAX	t	1.00
8496b17b-6c20-49fe-8c07-fa91b30588b8	0d0c87e5-95d3-4154-9064-f4d790dd2983	["Column / কলাম"]	t	1.00
46a7e7a3-4f11-4d01-909b-1d0e06595da7	13a091e7-a5e6-405c-a48c-c4129bc683d3	=	t	1.00
4344b05c-dda8-416d-bded-2516e9fa210c	029fc3b0-9c48-4fbb-9677-af33e7277f18	MAX	t	1.00
0ad9048b-f36f-4569-9c69-477db25385f4	298955cb-e6db-47fc-9cab-eed36da79791	IF	t	1.00
2e568f7d-b4d1-4ff1-bdec-f67ea61c70bb	0d0c87e5-95d3-4154-9064-f4d790dd2983	["Row / সারি"]	f	0.00
0ad9048b-f36f-4569-9c69-477db25385f4	470e201b-9ddc-4738-a700-f8147ddb2a49	Cell	t	1.00
d756ce60-c4ab-4b4c-a680-003d1497e4a1	35dff853-36c5-4f24-b54a-f49f2c1322f9	Fill Formatting Only	t	1.00
fd91991a-2f5c-4a8d-b12d-f183d6f7925e	35dff853-36c5-4f24-b54a-f49f2c1322f9	Fill Formatting Only	t	1.00
9e2f8337-9cd8-4506-b4d0-fc622fe06ca7	c2b4b7f2-9fb8-4d30-b9de-017d8c5ba2de	Numbers	t	1.00
4344b05c-dda8-416d-bded-2516e9fa210c	35dff853-36c5-4f24-b54a-f49f2c1322f9	Fill Formatting Only	t	1.00
722cf1a8-1f40-40e8-9092-54139aa2640d	ec445dac-554e-42f1-9f2b-56e66908bbe3	TODAY	f	0.00
986ed183-9244-4b47-a0e7-b5260db0faec	298955cb-e6db-47fc-9cab-eed36da79791	IF	t	1.00
a6c77b0d-2939-4b6b-af4a-32e1c592d903	35dff853-36c5-4f24-b54a-f49f2c1322f9	Copy Cells	f	0.00
46a7e7a3-4f11-4d01-909b-1d0e06595da7	029fc3b0-9c48-4fbb-9677-af33e7277f18	MAX	t	1.00
d756ce60-c4ab-4b4c-a680-003d1497e4a1	298955cb-e6db-47fc-9cab-eed36da79791	IF	t	1.00
d756ce60-c4ab-4b4c-a680-003d1497e4a1	470e201b-9ddc-4738-a700-f8147ddb2a49	Cell	t	1.00
722cf1a8-1f40-40e8-9092-54139aa2640d	ece85ffd-57f4-462f-955c-f314b9c7ea3c	MID	t	1.00
986ed183-9244-4b47-a0e7-b5260db0faec	470e201b-9ddc-4738-a700-f8147ddb2a49	Cell	t	1.00
8496b17b-6c20-49fe-8c07-fa91b30588b8	f8f69dee-87eb-46b3-b6f4-c38ff0faf1c5	["Formula Bar / ফর্মুলা বার"]	t	1.00
9e2f8337-9cd8-4506-b4d0-fc622fe06ca7	13a091e7-a5e6-405c-a48c-c4129bc683d3	=	t	1.00
d756ce60-c4ab-4b4c-a680-003d1497e4a1	ec445dac-554e-42f1-9f2b-56e66908bbe3	NOW	t	1.00
a6c77b0d-2939-4b6b-af4a-32e1c592d903	298955cb-e6db-47fc-9cab-eed36da79791	SUMIF	f	0.00
4344b05c-dda8-416d-bded-2516e9fa210c	298955cb-e6db-47fc-9cab-eed36da79791	IF	t	1.00
46a7e7a3-4f11-4d01-909b-1d0e06595da7	35dff853-36c5-4f24-b54a-f49f2c1322f9	Fill Formatting Only	t	1.00
986ed183-9244-4b47-a0e7-b5260db0faec	ec445dac-554e-42f1-9f2b-56e66908bbe3	NOW	t	1.00
d756ce60-c4ab-4b4c-a680-003d1497e4a1	ece85ffd-57f4-462f-955c-f314b9c7ea3c	MID	t	1.00
722cf1a8-1f40-40e8-9092-54139aa2640d	0d0c87e5-95d3-4154-9064-f4d790dd2983	["Column / কলাম"]	t	1.00
a6c77b0d-2939-4b6b-af4a-32e1c592d903	470e201b-9ddc-4738-a700-f8147ddb2a49	Cell	t	1.00
8496b17b-6c20-49fe-8c07-fa91b30588b8	c67a6153-b9e3-4518-9992-6e882273f597	["SUMIF"]	t	1.00
a6c77b0d-2939-4b6b-af4a-32e1c592d903	ec445dac-554e-42f1-9f2b-56e66908bbe3	NOW	t	1.00
a1c4bc64-ccc9-4883-8ca7-d4443a873d54	0fde9b9b-a7dc-4c9d-96c4-6c48a135e0bb	Row	t	1.00
fd91991a-2f5c-4a8d-b12d-f183d6f7925e	298955cb-e6db-47fc-9cab-eed36da79791	IF	t	1.00
9e2f8337-9cd8-4506-b4d0-fc622fe06ca7	029fc3b0-9c48-4fbb-9677-af33e7277f18	MAX	t	1.00
4344b05c-dda8-416d-bded-2516e9fa210c	470e201b-9ddc-4738-a700-f8147ddb2a49	Cell	t	1.00
2e568f7d-b4d1-4ff1-bdec-f67ea61c70bb	f8f69dee-87eb-46b3-b6f4-c38ff0faf1c5	["Hardcoded / হার্ডকোডেড"]	f	0.00
2e568f7d-b4d1-4ff1-bdec-f67ea61c70bb	35dff853-36c5-4f24-b54a-f49f2c1322f9	Fill Series	f	0.00
fd91991a-2f5c-4a8d-b12d-f183d6f7925e	470e201b-9ddc-4738-a700-f8147ddb2a49	Cell	t	1.00
46a7e7a3-4f11-4d01-909b-1d0e06595da7	298955cb-e6db-47fc-9cab-eed36da79791	IF	t	1.00
8496b17b-6c20-49fe-8c07-fa91b30588b8	529ae2ad-c7dd-483c-be8d-449d7ddab0c9	["Auto Fill / অটো ফিল"]	t	1.00
a1c4bc64-ccc9-4883-8ca7-d4443a873d54	c2b4b7f2-9fb8-4d30-b9de-017d8c5ba2de	Numbers	t	1.00
986ed183-9244-4b47-a0e7-b5260db0faec	ece85ffd-57f4-462f-955c-f314b9c7ea3c	MID	t	1.00
4344b05c-dda8-416d-bded-2516e9fa210c	ec445dac-554e-42f1-9f2b-56e66908bbe3	DATE	f	0.00
0ad9048b-f36f-4569-9c69-477db25385f4	ec445dac-554e-42f1-9f2b-56e66908bbe3	NOW	t	1.00
8496b17b-6c20-49fe-8c07-fa91b30588b8	49e74ece-1bf8-4ba7-9e7a-423160814df2	True	t	1.00
46a7e7a3-4f11-4d01-909b-1d0e06595da7	470e201b-9ddc-4738-a700-f8147ddb2a49	Table	f	0.00
d756ce60-c4ab-4b4c-a680-003d1497e4a1	0d0c87e5-95d3-4154-9064-f4d790dd2983	["Row / সারি"]	f	0.00
2e568f7d-b4d1-4ff1-bdec-f67ea61c70bb	c67a6153-b9e3-4518-9992-6e882273f597	["SUMIF"]	t	1.00
fd91991a-2f5c-4a8d-b12d-f183d6f7925e	ec445dac-554e-42f1-9f2b-56e66908bbe3	TODAY	f	0.00
0ad9048b-f36f-4569-9c69-477db25385f4	ece85ffd-57f4-462f-955c-f314b9c7ea3c	MID	t	1.00
8496b17b-6c20-49fe-8c07-fa91b30588b8	e2f86e92-f885-4f2b-ac96-644db9cb94ab	True	t	1.00
9e2f8337-9cd8-4506-b4d0-fc622fe06ca7	35dff853-36c5-4f24-b54a-f49f2c1322f9	Auto Fill	f	0.00
46a7e7a3-4f11-4d01-909b-1d0e06595da7	ec445dac-554e-42f1-9f2b-56e66908bbe3	NOW	t	1.00
4344b05c-dda8-416d-bded-2516e9fa210c	ece85ffd-57f4-462f-955c-f314b9c7ea3c	BETWEEN	f	0.00
2e568f7d-b4d1-4ff1-bdec-f67ea61c70bb	6a765bb1-0292-46c6-8709-ecf5e9f99626	["Auto Fill / অটো ফিল"]	f	0.00
9e2f8337-9cd8-4506-b4d0-fc622fe06ca7	5833849f-e021-4927-bace-bc24f886f3e3	NDIA	f	0.00
46a7e7a3-4f11-4d01-909b-1d0e06595da7	0fde9b9b-a7dc-4c9d-96c4-6c48a135e0bb	Column	f	0.00
fd91991a-2f5c-4a8d-b12d-f183d6f7925e	c2b4b7f2-9fb8-4d30-b9de-017d8c5ba2de	Numbers	t	1.00
0ad9048b-f36f-4569-9c69-477db25385f4	35dff853-36c5-4f24-b54a-f49f2c1322f9	Fill Series	f	0.00
8496b17b-6c20-49fe-8c07-fa91b30588b8	35dff853-36c5-4f24-b54a-f49f2c1322f9	Fill Formatting Only	t	1.00
0ad9048b-f36f-4569-9c69-477db25385f4	0d0c87e5-95d3-4154-9064-f4d790dd2983	["Column / কলাম"]	t	1.00
986ed183-9244-4b47-a0e7-b5260db0faec	0d0c87e5-95d3-4154-9064-f4d790dd2983	["Column / কলাম"]	t	1.00
8496b17b-6c20-49fe-8c07-fa91b30588b8	0e7f5ca9-1c4a-4205-9c24-f73e464ce63e	False	t	1.00
9e2f8337-9cd8-4506-b4d0-fc622fe06ca7	298955cb-e6db-47fc-9cab-eed36da79791	IF	t	1.00
2e568f7d-b4d1-4ff1-bdec-f67ea61c70bb	49e74ece-1bf8-4ba7-9e7a-423160814df2	False	f	0.00
2e568f7d-b4d1-4ff1-bdec-f67ea61c70bb	e2f86e92-f885-4f2b-ac96-644db9cb94ab	True	t	1.00
fd91991a-2f5c-4a8d-b12d-f183d6f7925e	0d0c87e5-95d3-4154-9064-f4d790dd2983	["Column / কলাম"]	t	1.00
4344b05c-dda8-416d-bded-2516e9fa210c	0d0c87e5-95d3-4154-9064-f4d790dd2983	["Column / কলাম"]	t	1.00
722cf1a8-1f40-40e8-9092-54139aa2640d	6a765bb1-0292-46c6-8709-ecf5e9f99626	["Hardcoded / হার্ডকোডেড"]	t	1.00
46a7e7a3-4f11-4d01-909b-1d0e06595da7	5833849f-e021-4927-bace-bc24f886f3e3	INDI	t	1.00
8496b17b-6c20-49fe-8c07-fa91b30588b8	d2c86384-9cdd-40d4-a728-a174f7f2fbe1	True	t	1.00
a6c77b0d-2939-4b6b-af4a-32e1c592d903	0d0c87e5-95d3-4154-9064-f4d790dd2983	["Row / সারি"]	f	0.00
2e568f7d-b4d1-4ff1-bdec-f67ea61c70bb	0e7f5ca9-1c4a-4205-9c24-f73e464ce63e	True	f	0.00
722cf1a8-1f40-40e8-9092-54139aa2640d	0e7f5ca9-1c4a-4205-9c24-f73e464ce63e	True	f	0.00
a1c4bc64-ccc9-4883-8ca7-d4443a873d54	35dff853-36c5-4f24-b54a-f49f2c1322f9	Fill Formatting Only	t	1.00
2e568f7d-b4d1-4ff1-bdec-f67ea61c70bb	d2c86384-9cdd-40d4-a728-a174f7f2fbe1	True	t	1.00
46a7e7a3-4f11-4d01-909b-1d0e06595da7	ece85ffd-57f4-462f-955c-f314b9c7ea3c	MID	t	1.00
9e2f8337-9cd8-4506-b4d0-fc622fe06ca7	ece85ffd-57f4-462f-955c-f314b9c7ea3c	MID	t	1.00
9e2f8337-9cd8-4506-b4d0-fc622fe06ca7	470e201b-9ddc-4738-a700-f8147ddb2a49	Cell	t	1.00
986ed183-9244-4b47-a0e7-b5260db0faec	f8f69dee-87eb-46b3-b6f4-c38ff0faf1c5	["Formula Bar / ফর্মুলা বার"]	t	1.00
a6c77b0d-2939-4b6b-af4a-32e1c592d903	6a765bb1-0292-46c6-8709-ecf5e9f99626	["SUMIF"]	f	0.00
4344b05c-dda8-416d-bded-2516e9fa210c	6a765bb1-0292-46c6-8709-ecf5e9f99626	["Auto Fill / অটো ফিল"]	f	0.00
d756ce60-c4ab-4b4c-a680-003d1497e4a1	529ae2ad-c7dd-483c-be8d-449d7ddab0c9	["Auto Fill / অটো ফিল"]	t	1.00
46a7e7a3-4f11-4d01-909b-1d0e06595da7	0d0c87e5-95d3-4154-9064-f4d790dd2983	["Column / কলাম"]	t	1.00
8496b17b-6c20-49fe-8c07-fa91b30588b8	16fc6906-3890-4082-acfc-7ffe3019fed9	{"=TIME(14, 30, 0)":"Creates 2:30 PM / 2:30 PM তৈরি করে","Fill Series":"Correct: Fills data in a 1, 2, 3 pattern / ১, ২, ৩ প্যাটার্ন অনুযায়ী পূরণ করে","Worksheet":"The grid page seen when opening Excel / এক্সেল ওপেন করলে যে ছককাটা পাতা দেখা যায়","=MID(\\"INDIA\\", 2, 3)":"Returns \\"NDI\\" / \\"NDI\\" রেজাল্ট দেয়","=SUM(A1:A5)":"Adds multiple cell numbers together / একাধিক সেলের সংখ্যা যোগ করে"}	t	5.00
4344b05c-dda8-416d-bded-2516e9fa210c	f8f69dee-87eb-46b3-b6f4-c38ff0faf1c5	["Formula Bar / ফর্মুলা বার"]	t	1.00
a1c4bc64-ccc9-4883-8ca7-d4443a873d54	ec445dac-554e-42f1-9f2b-56e66908bbe3	NOW	t	1.00
a6c77b0d-2939-4b6b-af4a-32e1c592d903	f8f69dee-87eb-46b3-b6f4-c38ff0faf1c5	["Formula Bar / ফর্মুলা বার"]	t	1.00
d756ce60-c4ab-4b4c-a680-003d1497e4a1	f8f69dee-87eb-46b3-b6f4-c38ff0faf1c5	["Formula Bar / ফর্মুলা বার"]	t	1.00
a6c77b0d-2939-4b6b-af4a-32e1c592d903	529ae2ad-c7dd-483c-be8d-449d7ddab0c9	["Auto Fill / অটো ফিল"]	t	1.00
9e2f8337-9cd8-4506-b4d0-fc622fe06ca7	ec445dac-554e-42f1-9f2b-56e66908bbe3	NOW	t	1.00
a1c4bc64-ccc9-4883-8ca7-d4443a873d54	470e201b-9ddc-4738-a700-f8147ddb2a49	Table	f	0.00
722cf1a8-1f40-40e8-9092-54139aa2640d	529ae2ad-c7dd-483c-be8d-449d7ddab0c9	["Auto Fill / অটো ফিল"]	t	1.00
722cf1a8-1f40-40e8-9092-54139aa2640d	c67a6153-b9e3-4518-9992-6e882273f597	["SUMIF"]	t	1.00
d756ce60-c4ab-4b4c-a680-003d1497e4a1	c67a6153-b9e3-4518-9992-6e882273f597	["SUMIF"]	t	1.00
986ed183-9244-4b47-a0e7-b5260db0faec	49e74ece-1bf8-4ba7-9e7a-423160814df2	True	t	1.00
722cf1a8-1f40-40e8-9092-54139aa2640d	49e74ece-1bf8-4ba7-9e7a-423160814df2	True	t	1.00
986ed183-9244-4b47-a0e7-b5260db0faec	529ae2ad-c7dd-483c-be8d-449d7ddab0c9	["Auto Fill / অটো ফিল"]	t	1.00
7c6bc8a4-376a-4405-b0ab-fd312b3b728d	6d1bc6bc-1454-4b89-9aae-8b94acdc5e73	["Feelings or Brain / অনুভূতি বা নিজস্ব বুদ্ধি"]	f	0.00
0ad9048b-f36f-4569-9c69-477db25385f4	f8f69dee-87eb-46b3-b6f4-c38ff0faf1c5	["Formula Bar / ফর্মুলা বার"]	t	1.00
2e568f7d-b4d1-4ff1-bdec-f67ea61c70bb	16fc6906-3890-4082-acfc-7ffe3019fed9	{"Worksheet":"The grid page seen when opening Excel / এক্সেল ওপেন করলে যে ছককাটা পাতা দেখা যায়","=SUM(A1:A5)":"Adds multiple cell numbers together / একাধিক সেলের সংখ্যা যোগ করে","Fill Series":"Correct: Fills data in a 1, 2, 3 pattern / ১, ২, ৩ প্যাটার্ন অনুযায়ী পূরণ করে","=TIME(14, 30, 0)":"Creates 2:30 PM / 2:30 PM তৈরি করে","=MID(\\"INDIA\\", 2, 3)":"Returns \\"NDI\\" / \\"NDI\\" রেজাল্ট দেয়"}	t	5.00
722cf1a8-1f40-40e8-9092-54139aa2640d	e2f86e92-f885-4f2b-ac96-644db9cb94ab	True	t	1.00
4344b05c-dda8-416d-bded-2516e9fa210c	c67a6153-b9e3-4518-9992-6e882273f597	["SUMIF"]	t	1.00
46a7e7a3-4f11-4d01-909b-1d0e06595da7	f8f69dee-87eb-46b3-b6f4-c38ff0faf1c5	["Formula Bar / ফর্মুলা বার"]	t	1.00
722cf1a8-1f40-40e8-9092-54139aa2640d	b975a0c6-1ce4-42be-8557-6b69b1a3428b	True	f	0.00
a1c4bc64-ccc9-4883-8ca7-d4443a873d54	ece85ffd-57f4-462f-955c-f314b9c7ea3c	BETWEEN	f	0.00
986ed183-9244-4b47-a0e7-b5260db0faec	b975a0c6-1ce4-42be-8557-6b69b1a3428b	False	t	1.00
0ad9048b-f36f-4569-9c69-477db25385f4	c67a6153-b9e3-4518-9992-6e882273f597	["SUMIF"]	t	1.00
d756ce60-c4ab-4b4c-a680-003d1497e4a1	49e74ece-1bf8-4ba7-9e7a-423160814df2	True	t	1.00
4344b05c-dda8-416d-bded-2516e9fa210c	529ae2ad-c7dd-483c-be8d-449d7ddab0c9	["Bar / বার"]	f	0.00
986ed183-9244-4b47-a0e7-b5260db0faec	e2f86e92-f885-4f2b-ac96-644db9cb94ab	True	t	1.00
722cf1a8-1f40-40e8-9092-54139aa2640d	d2c86384-9cdd-40d4-a728-a174f7f2fbe1	True	t	1.00
a1c4bc64-ccc9-4883-8ca7-d4443a873d54	298955cb-e6db-47fc-9cab-eed36da79791	IF	t	1.00
9e2f8337-9cd8-4506-b4d0-fc622fe06ca7	0d0c87e5-95d3-4154-9064-f4d790dd2983	["Row / সারি"]	f	0.00
46a7e7a3-4f11-4d01-909b-1d0e06595da7	529ae2ad-c7dd-483c-be8d-449d7ddab0c9	["Auto Fill / অটো ফিল"]	t	1.00
a6c77b0d-2939-4b6b-af4a-32e1c592d903	49e74ece-1bf8-4ba7-9e7a-423160814df2	True	t	1.00
0ad9048b-f36f-4569-9c69-477db25385f4	529ae2ad-c7dd-483c-be8d-449d7ddab0c9	["Auto Fill / অটো ফিল"]	t	1.00
a6c77b0d-2939-4b6b-af4a-32e1c592d903	c67a6153-b9e3-4518-9992-6e882273f597	["IF"]	f	0.00
fd91991a-2f5c-4a8d-b12d-f183d6f7925e	6a765bb1-0292-46c6-8709-ecf5e9f99626	["Hardcoded / হার্ডকোডেড"]	t	1.00
a6c77b0d-2939-4b6b-af4a-32e1c592d903	e2f86e92-f885-4f2b-ac96-644db9cb94ab	True	t	1.00
4344b05c-dda8-416d-bded-2516e9fa210c	49e74ece-1bf8-4ba7-9e7a-423160814df2	False	f	0.00
fd91991a-2f5c-4a8d-b12d-f183d6f7925e	f8f69dee-87eb-46b3-b6f4-c38ff0faf1c5	["Formula Bar / ফর্মুলা বার"]	t	1.00
986ed183-9244-4b47-a0e7-b5260db0faec	0e7f5ca9-1c4a-4205-9c24-f73e464ce63e	True	f	0.00
d756ce60-c4ab-4b4c-a680-003d1497e4a1	e2f86e92-f885-4f2b-ac96-644db9cb94ab	True	t	1.00
4344b05c-dda8-416d-bded-2516e9fa210c	e2f86e92-f885-4f2b-ac96-644db9cb94ab	False	f	0.00
8496b17b-6c20-49fe-8c07-fa91b30588b8	b975a0c6-1ce4-42be-8557-6b69b1a3428b	False	t	1.00
7c6bc8a4-376a-4405-b0ab-fd312b3b728d	a8fa7cf0-2d31-4cc3-bcdd-34de348102be	["Desktop / ডেক্সটপ"]	t	1.00
722cf1a8-1f40-40e8-9092-54139aa2640d	f8f69dee-87eb-46b3-b6f4-c38ff0faf1c5	["Bar / বার"]	f	0.00
2e568f7d-b4d1-4ff1-bdec-f67ea61c70bb	b975a0c6-1ce4-42be-8557-6b69b1a3428b	True	f	0.00
df9b93cc-bd96-4fc8-b2b0-641df6dcb1d9	2727adab-dfed-48f6-b9ee-fb0b02e9dce3	True	f	0.00
da260c91-075f-4b69-9e4f-21e38e225b15	3972b1b1-b849-4fff-acb9-7123335ee37d	False	t	1.00
da260c91-075f-4b69-9e4f-21e38e225b15	77111870-6a87-4ba3-b3b0-89dfadb379d4	False	t	1.00
722cf1a8-1f40-40e8-9092-54139aa2640d	16fc6906-3890-4082-acfc-7ffe3019fed9	{"Worksheet":"The grid page seen when opening Excel / এক্সেল ওপেন করলে যে ছককাটা পাতা দেখা যায়","=SUM(A1:A5)":"Adds multiple cell numbers together / একাধিক সেলের সংখ্যা যোগ করে","=TIME(14, 30, 0)":"Creates 2:30 PM / 2:30 PM তৈরি করে","=MID(\\"INDIA\\", 2, 3)":"Returns \\"NDI\\" / \\"NDI\\" রেজাল্ট দেয়","Fill Series":"Correct: Fills data in a 1, 2, 3 pattern / ১, ২, ৩ প্যাটার্ন অনুযায়ী পূরণ করে"}	t	5.00
986ed183-9244-4b47-a0e7-b5260db0faec	d2c86384-9cdd-40d4-a728-a174f7f2fbe1	True	t	1.00
d756ce60-c4ab-4b4c-a680-003d1497e4a1	b975a0c6-1ce4-42be-8557-6b69b1a3428b	True	f	0.00
0ad9048b-f36f-4569-9c69-477db25385f4	6a765bb1-0292-46c6-8709-ecf5e9f99626	["IF"]	f	0.00
4344b05c-dda8-416d-bded-2516e9fa210c	b975a0c6-1ce4-42be-8557-6b69b1a3428b	True	f	0.00
46a7e7a3-4f11-4d01-909b-1d0e06595da7	6a765bb1-0292-46c6-8709-ecf5e9f99626	["SUMIF"]	f	0.00
a6c77b0d-2939-4b6b-af4a-32e1c592d903	b975a0c6-1ce4-42be-8557-6b69b1a3428b	False	t	1.00
d756ce60-c4ab-4b4c-a680-003d1497e4a1	0e7f5ca9-1c4a-4205-9c24-f73e464ce63e	False	t	1.00
a6c77b0d-2939-4b6b-af4a-32e1c592d903	0e7f5ca9-1c4a-4205-9c24-f73e464ce63e	False	t	1.00
0ad9048b-f36f-4569-9c69-477db25385f4	49e74ece-1bf8-4ba7-9e7a-423160814df2	True	t	1.00
d756ce60-c4ab-4b4c-a680-003d1497e4a1	5833849f-e021-4927-bace-bc24f886f3e3	INDI	t	1.00
4344b05c-dda8-416d-bded-2516e9fa210c	0e7f5ca9-1c4a-4205-9c24-f73e464ce63e	True	f	0.00
a6c77b0d-2939-4b6b-af4a-32e1c592d903	d2c86384-9cdd-40d4-a728-a174f7f2fbe1	True	t	1.00
4344b05c-dda8-416d-bded-2516e9fa210c	d2c86384-9cdd-40d4-a728-a174f7f2fbe1	True	t	1.00
46a7e7a3-4f11-4d01-909b-1d0e06595da7	49e74ece-1bf8-4ba7-9e7a-423160814df2	True	t	1.00
0ad9048b-f36f-4569-9c69-477db25385f4	e2f86e92-f885-4f2b-ac96-644db9cb94ab	True	t	1.00
46a7e7a3-4f11-4d01-909b-1d0e06595da7	e2f86e92-f885-4f2b-ac96-644db9cb94ab	True	t	1.00
d756ce60-c4ab-4b4c-a680-003d1497e4a1	d2c86384-9cdd-40d4-a728-a174f7f2fbe1	True	t	1.00
0ad9048b-f36f-4569-9c69-477db25385f4	b975a0c6-1ce4-42be-8557-6b69b1a3428b	False	t	1.00
46a7e7a3-4f11-4d01-909b-1d0e06595da7	b975a0c6-1ce4-42be-8557-6b69b1a3428b	False	t	1.00
a1c4bc64-ccc9-4883-8ca7-d4443a873d54	b975a0c6-1ce4-42be-8557-6b69b1a3428b	False	t	1.00
986ed183-9244-4b47-a0e7-b5260db0faec	6a765bb1-0292-46c6-8709-ecf5e9f99626	["SUMIF"]	f	0.00
46a7e7a3-4f11-4d01-909b-1d0e06595da7	0e7f5ca9-1c4a-4205-9c24-f73e464ce63e	True	f	0.00
0ad9048b-f36f-4569-9c69-477db25385f4	0e7f5ca9-1c4a-4205-9c24-f73e464ce63e	False	t	1.00
9e2f8337-9cd8-4506-b4d0-fc622fe06ca7	f8f69dee-87eb-46b3-b6f4-c38ff0faf1c5	["Auto Fill / অটো ফিল"]	f	0.00
9e2f8337-9cd8-4506-b4d0-fc622fe06ca7	529ae2ad-c7dd-483c-be8d-449d7ddab0c9	["Formula Bar / ফর্মুলা বার"]	f	0.00
fd91991a-2f5c-4a8d-b12d-f183d6f7925e	529ae2ad-c7dd-483c-be8d-449d7ddab0c9	["Auto Fill / অটো ফিল"]	t	1.00
46a7e7a3-4f11-4d01-909b-1d0e06595da7	d2c86384-9cdd-40d4-a728-a174f7f2fbe1	True	t	1.00
a1c4bc64-ccc9-4883-8ca7-d4443a873d54	e2f86e92-f885-4f2b-ac96-644db9cb94ab	True	t	1.00
0ad9048b-f36f-4569-9c69-477db25385f4	d2c86384-9cdd-40d4-a728-a174f7f2fbe1	True	t	1.00
4344b05c-dda8-416d-bded-2516e9fa210c	16fc6906-3890-4082-acfc-7ffe3019fed9	{"Worksheet":"The grid page seen when opening Excel / এক্সেল ওপেন করলে যে ছককাটা পাতা দেখা যায়","=TIME(14, 30, 0)":"Creates 2:30 PM / 2:30 PM তৈরি করে","=MID(\\"INDIA\\", 2, 3)":"Returns \\"NDI\\" / \\"NDI\\" রেজাল্ট দেয়","=SUM(A1:A5)":"Adds multiple cell numbers together / একাধিক সেলের সংখ্যা যোগ করে","Fill Series":"Correct: Fills data in a 1, 2, 3 pattern / ১, ২, ৩ প্যাটার্ন অনুযায়ী পূরণ করে"}	t	5.00
fd91991a-2f5c-4a8d-b12d-f183d6f7925e	49e74ece-1bf8-4ba7-9e7a-423160814df2	True	t	1.00
fd91991a-2f5c-4a8d-b12d-f183d6f7925e	e2f86e92-f885-4f2b-ac96-644db9cb94ab	False	f	0.00
a1c4bc64-ccc9-4883-8ca7-d4443a873d54	49e74ece-1bf8-4ba7-9e7a-423160814df2	True	t	1.00
a6c77b0d-2939-4b6b-af4a-32e1c592d903	16fc6906-3890-4082-acfc-7ffe3019fed9	{"=MID(\\"INDIA\\", 2, 3)":"Returns \\"NDI\\" / \\"NDI\\" রেজাল্ট দেয়","=TIME(14, 30, 0)":"Creates 2:30 PM / 2:30 PM তৈরি করে","=SUM(A1:A5)":"Adds multiple cell numbers together / একাধিক সেলের সংখ্যা যোগ করে","Worksheet":"The grid page seen when opening Excel / এক্সেল ওপেন করলে যে ছককাটা পাতা দেখা যায়","Fill Series":"Correct: Fills data in a 1, 2, 3 pattern / ১, ২, ৩ প্যাটার্ন অনুযায়ী পূরণ করে"}	t	5.00
46a7e7a3-4f11-4d01-909b-1d0e06595da7	16fc6906-3890-4082-acfc-7ffe3019fed9	{"=MID(\\"INDIA\\", 2, 3)":"Returns \\"NDI\\" / \\"NDI\\" রেজাল্ট দেয়","=SUM(A1:A5)":"Adds multiple cell numbers together / একাধিক সেলের সংখ্যা যোগ করে","=TIME(14, 30, 0)":"Creates 2:30 PM / 2:30 PM তৈরি করে","Worksheet":"The grid page seen when opening Excel / এক্সেল ওপেন করলে যে ছককাটা পাতা দেখা যায়","Fill Series":"Correct: Fills data in a 1, 2, 3 pattern / ১, ২, ৩ প্যাটার্ন অনুযায়ী পূরণ করে"}	t	5.00
fd91991a-2f5c-4a8d-b12d-f183d6f7925e	b975a0c6-1ce4-42be-8557-6b69b1a3428b	False	t	1.00
a1c4bc64-ccc9-4883-8ca7-d4443a873d54	0e7f5ca9-1c4a-4205-9c24-f73e464ce63e	True	f	0.00
986ed183-9244-4b47-a0e7-b5260db0faec	c67a6153-b9e3-4518-9992-6e882273f597	["IF"]	f	0.00
a1c4bc64-ccc9-4883-8ca7-d4443a873d54	d2c86384-9cdd-40d4-a728-a174f7f2fbe1	True	t	1.00
d756ce60-c4ab-4b4c-a680-003d1497e4a1	16fc6906-3890-4082-acfc-7ffe3019fed9	{"=MID(\\"INDIA\\", 2, 3)":"Returns \\"NDI\\" / \\"NDI\\" রেজাল্ট দেয়","=TIME(14, 30, 0)":"Creates 2:30 PM / 2:30 PM তৈরি করে","=SUM(A1:A5)":"Adds multiple cell numbers together / একাধিক সেলের সংখ্যা যোগ করে","Worksheet":"The grid page seen when opening Excel / এক্সেল ওপেন করলে যে ছককাটা পাতা দেখা যায়","Fill Series":"Correct: Fills data in a 1, 2, 3 pattern / ১, ২, ৩ প্যাটার্ন অনুযায়ী পূরণ করে"}	t	5.00
9e2f8337-9cd8-4506-b4d0-fc622fe06ca7	6a765bb1-0292-46c6-8709-ecf5e9f99626	["Hardcoded / হার্ডকোডেড"]	t	1.00
fd91991a-2f5c-4a8d-b12d-f183d6f7925e	0e7f5ca9-1c4a-4205-9c24-f73e464ce63e	False	t	1.00
9e2f8337-9cd8-4506-b4d0-fc622fe06ca7	c67a6153-b9e3-4518-9992-6e882273f597	["SUMIF"]	t	1.00
a1c4bc64-ccc9-4883-8ca7-d4443a873d54	16fc6906-3890-4082-acfc-7ffe3019fed9	{"=SUM(A1:A5)":"Adds multiple cell numbers together / একাধিক সেলের সংখ্যা যোগ করে","Fill Series":"Correct: Fills data in a 1, 2, 3 pattern / ১, ২, ৩ প্যাটার্ন অনুযায়ী পূরণ করে","=MID(\\"INDIA\\", 2, 3)":"Returns \\"NDI\\" / \\"NDI\\" রেজাল্ট দেয়","Worksheet":"The grid page seen when opening Excel / এক্সেল ওপেন করলে যে ছককাটা পাতা দেখা যায়","=TIME(14, 30, 0)":"Creates 2:30 PM / 2:30 PM তৈরি করে"}	t	5.00
fd91991a-2f5c-4a8d-b12d-f183d6f7925e	c67a6153-b9e3-4518-9992-6e882273f597	["SUMIF"]	t	1.00
9e2f8337-9cd8-4506-b4d0-fc622fe06ca7	49e74ece-1bf8-4ba7-9e7a-423160814df2	True	t	1.00
fd91991a-2f5c-4a8d-b12d-f183d6f7925e	d2c86384-9cdd-40d4-a728-a174f7f2fbe1	True	t	1.00
8496b17b-6c20-49fe-8c07-fa91b30588b8	6a765bb1-0292-46c6-8709-ecf5e9f99626	["Hardcoded / হার্ডকোডেড"]	t	1.00
df9b93cc-bd96-4fc8-b2b0-641df6dcb1d9	cf208ba9-95ec-4ee5-acc7-d2c012841195	It will keep working without getting tired. / ক্লান্ত না হয়ে সে একটানা কাজ করে যাবে।	t	1.00
df9b93cc-bd96-4fc8-b2b0-641df6dcb1d9	77111870-6a87-4ba3-b3b0-89dfadb379d4	False	t	1.00
0ad9048b-f36f-4569-9c69-477db25385f4	16fc6906-3890-4082-acfc-7ffe3019fed9	{"Worksheet":"The grid page seen when opening Excel / এক্সেল ওপেন করলে যে ছককাটা পাতা দেখা যায়","=SUM(A1:A5)":"Adds multiple cell numbers together / একাধিক সেলের সংখ্যা যোগ করে","Fill Series":"Correct: Fills data in a 1, 2, 3 pattern / ১, ২, ৩ প্যাটার্ন অনুযায়ী পূরণ করে","=TIME(14, 30, 0)":"Creates 2:30 PM / 2:30 PM তৈরি করে","=MID(\\"INDIA\\", 2, 3)":"Returns \\"NDI\\" / \\"NDI\\" রেজাল্ট দেয়"}	t	5.00
da260c91-075f-4b69-9e4f-21e38e225b15	cf208ba9-95ec-4ee5-acc7-d2c012841195	It will keep working without getting tired. / ক্লান্ত না হয়ে সে একটানা কাজ করে যাবে।	t	1.00
a1c4bc64-ccc9-4883-8ca7-d4443a873d54	0d0c87e5-95d3-4154-9064-f4d790dd2983	["Hardcoded / হার্ডকোডেড"]	f	0.00
a1c4bc64-ccc9-4883-8ca7-d4443a873d54	c67a6153-b9e3-4518-9992-6e882273f597	["Bar / বার"]	f	0.00
46a7e7a3-4f11-4d01-909b-1d0e06595da7	c67a6153-b9e3-4518-9992-6e882273f597	["IF"]	f	0.00
986ed183-9244-4b47-a0e7-b5260db0faec	16fc6906-3890-4082-acfc-7ffe3019fed9	{"Worksheet":"The grid page seen when opening Excel / এক্সেল ওপেন করলে যে ছককাটা পাতা দেখা যায়","Fill Series":"Correct: Fills data in a 1, 2, 3 pattern / ১, ২, ৩ প্যাটার্ন অনুযায়ী পূরণ করে","=TIME(14, 30, 0)":"Creates 2:30 PM / 2:30 PM তৈরি করে","=SUM(A1:A5)":"Adds multiple cell numbers together / একাধিক সেলের সংখ্যা যোগ করে","=MID(\\"INDIA\\", 2, 3)":"Returns \\"NDI\\" / \\"NDI\\" রেজাল্ট দেয়"}	t	5.00
a1c4bc64-ccc9-4883-8ca7-d4443a873d54	f8f69dee-87eb-46b3-b6f4-c38ff0faf1c5	["Column / কলাম"]	f	0.00
a1c4bc64-ccc9-4883-8ca7-d4443a873d54	529ae2ad-c7dd-483c-be8d-449d7ddab0c9	["Auto Fill / অটো ফিল"]	t	1.00
9e2f8337-9cd8-4506-b4d0-fc622fe06ca7	16fc6906-3890-4082-acfc-7ffe3019fed9	{"Worksheet":"The grid page seen when opening Excel / এক্সেল ওপেন করলে যে ছককাটা পাতা দেখা যায়","Fill Series":"Correct: Fills data in a 1, 2, 3 pattern / ১, ২, ৩ প্যাটার্ন অনুযায়ী পূরণ করে","=MID(\\"INDIA\\", 2, 3)":"Returns \\"NDI\\" / \\"NDI\\" রেজাল্ট দেয়","=TIME(14, 30, 0)":"Creates 2:30 PM / 2:30 PM তৈরি করে","=SUM(A1:A5)":"Adds multiple cell numbers together / একাধিক সেলের সংখ্যা যোগ করে"}	t	5.00
7c6bc8a4-376a-4405-b0ab-fd312b3b728d	02a22274-6e49-43d8-b157-6f9d9f5fa18d	Because it can do many different tasks like drawing, math, and music at the same time. / কারণ এটি একই সাথে ছবি আঁকা, অঙ্ক করা এবং গান চালানোর মতো অনেক রকমের কাজ করতে পারে।	t	1.00
9e2f8337-9cd8-4506-b4d0-fc622fe06ca7	e2f86e92-f885-4f2b-ac96-644db9cb94ab	True	t	1.00
fd91991a-2f5c-4a8d-b12d-f183d6f7925e	16fc6906-3890-4082-acfc-7ffe3019fed9	{"Worksheet":"The grid page seen when opening Excel / এক্সেল ওপেন করলে যে ছককাটা পাতা দেখা যায়","=TIME(14, 30, 0)":"Creates 2:30 PM / 2:30 PM তৈরি করে","Fill Series":"Correct: Fills data in a 1, 2, 3 pattern / ১, ২, ৩ প্যাটার্ন অনুযায়ী পূরণ করে","=MID(\\"INDIA\\", 2, 3)":"Returns \\"NDI\\" / \\"NDI\\" রেজাল্ট দেয়"}	f	4.00
9e2f8337-9cd8-4506-b4d0-fc622fe06ca7	b975a0c6-1ce4-42be-8557-6b69b1a3428b	True	f	0.00
a1c4bc64-ccc9-4883-8ca7-d4443a873d54	029fc3b0-9c48-4fbb-9677-af33e7277f18	LARGE	f	0.00
9e2f8337-9cd8-4506-b4d0-fc622fe06ca7	d2c86384-9cdd-40d4-a728-a174f7f2fbe1	False	f	0.00
9e2f8337-9cd8-4506-b4d0-fc622fe06ca7	0e7f5ca9-1c4a-4205-9c24-f73e464ce63e	True	f	0.00
df9b93cc-bd96-4fc8-b2b0-641df6dcb1d9	8136dca8-ffca-4b6c-963b-ba2f642fdaee	The cartoon character is Software. / কার্টুন চরিত্রটি হলো সফটওয়্যার।	t	1.00
a1c4bc64-ccc9-4883-8ca7-d4443a873d54	6a765bb1-0292-46c6-8709-ecf5e9f99626	["Row / সারি"]	f	0.00
491e4671-6588-41ad-8fa8-f8073fd66d6d	cf208ba9-95ec-4ee5-acc7-d2c012841195	It will keep working without getting tired. / ক্লান্ত না হয়ে সে একটানা কাজ করে যাবে।	t	1.00
7c6bc8a4-376a-4405-b0ab-fd312b3b728d	cf208ba9-95ec-4ee5-acc7-d2c012841195	It will keep working without getting tired. / ক্লান্ত না হয়ে সে একটানা কাজ করে যাবে।	t	1.00
491e4671-6588-41ad-8fa8-f8073fd66d6d	c840af0c-dcb0-4de8-9659-ea81249bee44	["Feelings or Brain / অনুভূতি বা নিজস্ব বুদ্ধি"]	t	1.00
da260c91-075f-4b69-9e4f-21e38e225b15	5a8c4b9e-e6dd-4ea9-b794-c4ca30a8a16b	["Hard / হার্ড"]	t	1.00
df9b93cc-bd96-4fc8-b2b0-641df6dcb1d9	c840af0c-dcb0-4de8-9659-ea81249bee44	["Input / ইনপুট"]	f	0.00
a1c4bc64-ccc9-4883-8ca7-d4443a873d54	5833849f-e021-4927-bace-bc24f886f3e3	INDI	t	1.00
a1c4bc64-ccc9-4883-8ca7-d4443a873d54	13a091e7-a5e6-405c-a48c-c4129bc683d3	=	t	1.00
d756ce60-c4ab-4b4c-a680-003d1497e4a1	6a765bb1-0292-46c6-8709-ecf5e9f99626	["Hardcoded / হার্ডকোডেড"]	t	1.00
7c6bc8a4-376a-4405-b0ab-fd312b3b728d	c840af0c-dcb0-4de8-9659-ea81249bee44	["Human / মানুষ"]	f	0.00
491e4671-6588-41ad-8fa8-f8073fd66d6d	e21532bd-a3b4-4961-b6bf-b3b089109b3b	True	t	1.00
7c6bc8a4-376a-4405-b0ab-fd312b3b728d	e21532bd-a3b4-4961-b6bf-b3b089109b3b	True	t	1.00
da260c91-075f-4b69-9e4f-21e38e225b15	6d1bc6bc-1454-4b89-9aae-8b94acdc5e73	["Human / মানুষ"]	f	0.00
df9b93cc-bd96-4fc8-b2b0-641df6dcb1d9	a8fa7cf0-2d31-4cc3-bcdd-34de348102be	["User / ব্যবহারকারী"]	f	0.00
7c6bc8a4-376a-4405-b0ab-fd312b3b728d	17dbcc6f-8d7c-497e-a6c7-b974fa21997b	True	t	1.00
df9b93cc-bd96-4fc8-b2b0-641df6dcb1d9	e21532bd-a3b4-4961-b6bf-b3b089109b3b	True	t	1.00
491e4671-6588-41ad-8fa8-f8073fd66d6d	17dbcc6f-8d7c-497e-a6c7-b974fa21997b	True	t	1.00
df9b93cc-bd96-4fc8-b2b0-641df6dcb1d9	7b2d2c55-55b5-45b9-856b-d715f3c90270	Wait patiently without making random clicks. / এলোমেলো ক্লিক না করে ধৈর্য ধরে অপেক্ষা করা।	t	1.00
491e4671-6588-41ad-8fa8-f8073fd66d6d	8136dca8-ffca-4b6c-963b-ba2f642fdaee	The cartoon character is Software. / কার্টুন চরিত্রটি হলো সফটওয়্যার।	t	1.00
7c6bc8a4-376a-4405-b0ab-fd312b3b728d	8136dca8-ffca-4b6c-963b-ba2f642fdaee	The television screen is Software. / টেলিভিশন স্ক্রিনটি হলো সফটওয়্যার।	f	0.00
da260c91-075f-4b69-9e4f-21e38e225b15	8136dca8-ffca-4b6c-963b-ba2f642fdaee	The cartoon character is Software. / কার্টুন চরিত্রটি হলো সফটওয়্যার।	t	1.00
491e4671-6588-41ad-8fa8-f8073fd66d6d	002a8370-75a7-40e9-abe5-d8579aff5365	["Input / ইনপুট"]	t	1.00
df9b93cc-bd96-4fc8-b2b0-641df6dcb1d9	002a8370-75a7-40e9-abe5-d8579aff5365	["Hard / হার্ড"]	f	0.00
7c6bc8a4-376a-4405-b0ab-fd312b3b728d	002a8370-75a7-40e9-abe5-d8579aff5365	["Input / ইনপুট"]	t	1.00
df9b93cc-bd96-4fc8-b2b0-641df6dcb1d9	5a8c4b9e-e6dd-4ea9-b794-c4ca30a8a16b	["Desktop / ডেক্সটপ"]	f	0.00
491e4671-6588-41ad-8fa8-f8073fd66d6d	5a8c4b9e-e6dd-4ea9-b794-c4ca30a8a16b	["Hard / হার্ড"]	t	1.00
491e4671-6588-41ad-8fa8-f8073fd66d6d	6d1bc6bc-1454-4b89-9aae-8b94acdc5e73	["Human / মানুষ"]	f	0.00
df9b93cc-bd96-4fc8-b2b0-641df6dcb1d9	6d1bc6bc-1454-4b89-9aae-8b94acdc5e73	["Human / মানুষ"]	f	0.00
7c6bc8a4-376a-4405-b0ab-fd312b3b728d	5a8c4b9e-e6dd-4ea9-b794-c4ca30a8a16b	["Hard / হার্ড"]	t	1.00
da260c91-075f-4b69-9e4f-21e38e225b15	002a8370-75a7-40e9-abe5-d8579aff5365	["Input / ইনপুট"]	t	1.00
491e4671-6588-41ad-8fa8-f8073fd66d6d	a8fa7cf0-2d31-4cc3-bcdd-34de348102be	["Desktop / ডেক্সটপ"]	t	1.00
da260c91-075f-4b69-9e4f-21e38e225b15	a8fa7cf0-2d31-4cc3-bcdd-34de348102be	["Desktop / ডেক্সটপ"]	t	1.00
df9b93cc-bd96-4fc8-b2b0-641df6dcb1d9	17dbcc6f-8d7c-497e-a6c7-b974fa21997b	True	t	1.00
da260c91-075f-4b69-9e4f-21e38e225b15	c840af0c-dcb0-4de8-9659-ea81249bee44	["Feelings or Brain / অনুভূতি বা নিজস্ব বুদ্ধি"]	t	1.00
da260c91-075f-4b69-9e4f-21e38e225b15	e21532bd-a3b4-4961-b6bf-b3b089109b3b	True	t	1.00
491e4671-6588-41ad-8fa8-f8073fd66d6d	3972b1b1-b849-4fff-acb9-7123335ee37d	True	f	0.00
da260c91-075f-4b69-9e4f-21e38e225b15	17dbcc6f-8d7c-497e-a6c7-b974fa21997b	True	t	1.00
7c6bc8a4-376a-4405-b0ab-fd312b3b728d	3972b1b1-b849-4fff-acb9-7123335ee37d	True	f	0.00
491e4671-6588-41ad-8fa8-f8073fd66d6d	77111870-6a87-4ba3-b3b0-89dfadb379d4	False	t	1.00
da260c91-075f-4b69-9e4f-21e38e225b15	2727adab-dfed-48f6-b9ee-fb0b02e9dce3	True	f	0.00
df9b93cc-bd96-4fc8-b2b0-641df6dcb1d9	3972b1b1-b849-4fff-acb9-7123335ee37d	True	f	0.00
7c6bc8a4-376a-4405-b0ab-fd312b3b728d	2727adab-dfed-48f6-b9ee-fb0b02e9dce3	True	f	0.00
491e4671-6588-41ad-8fa8-f8073fd66d6d	2727adab-dfed-48f6-b9ee-fb0b02e9dce3	False	t	1.00
da260c91-075f-4b69-9e4f-21e38e225b15	7b2d2c55-55b5-45b9-856b-d715f3c90270	Wait patiently without making random clicks. / এলোমেলো ক্লিক না করে ধৈর্য ধরে অপেক্ষা করা।	t	1.00
491e4671-6588-41ad-8fa8-f8073fd66d6d	7b2d2c55-55b5-45b9-856b-d715f3c90270	Wait patiently without making random clicks. / এলোমেলো ক্লিক না করে ধৈর্য ধরে অপেক্ষা করা।	t	1.00
7c6bc8a4-376a-4405-b0ab-fd312b3b728d	7b2d2c55-55b5-45b9-856b-d715f3c90270	Wait patiently without making random clicks. / এলোমেলো ক্লিক না করে ধৈর্য ধরে অপেক্ষা করা।	t	1.00
df9b93cc-bd96-4fc8-b2b0-641df6dcb1d9	136074ee-4b85-40ea-9e18-236180986b2c	Process and Output / প্রসেস এবং আউটপুট	f	0.00
da260c91-075f-4b69-9e4f-21e38e225b15	136074ee-4b85-40ea-9e18-236180986b2c	Process and Output / প্রসেস এবং আউটপুট	f	0.00
491e4671-6588-41ad-8fa8-f8073fd66d6d	136074ee-4b85-40ea-9e18-236180986b2c	Only Input / শুধুমাত্র ইনপুট (Input)	t	1.00
df9b93cc-bd96-4fc8-b2b0-641df6dcb1d9	02a22274-6e49-43d8-b157-6f9d9f5fa18d	Because it can do many different tasks like drawing, math, and music at the same time. / কারণ এটি একই সাথে ছবি আঁকা, অঙ্ক করা এবং গান চালানোর মতো অনেক রকমের কাজ করতে পারে।	t	1.00
7c6bc8a4-376a-4405-b0ab-fd312b3b728d	136074ee-4b85-40ea-9e18-236180986b2c	Only Output / শুধুমাত্র আউটপুট (Output)	f	0.00
491e4671-6588-41ad-8fa8-f8073fd66d6d	02a22274-6e49-43d8-b157-6f9d9f5fa18d	Because it can do many different tasks like drawing, math, and music at the same time. / কারণ এটি একই সাথে ছবি আঁকা, অঙ্ক করা এবং গান চালানোর মতো অনেক রকমের কাজ করতে পারে।	t	1.00
7c6bc8a4-376a-4405-b0ab-fd312b3b728d	77111870-6a87-4ba3-b3b0-89dfadb379d4	True	f	0.00
7c6bc8a4-376a-4405-b0ab-fd312b3b728d	14edfa07-34b3-4b0f-b80d-1d62004168b1	{"A Microphone / মাইক্রোফোন":"A hardware component acting like the computer's ear / একটি হার্ডওয়্যার অংশ যা কম্পিউটারের কানের মতো কাজ করে","Plastic Mouse and Wires / প্লাস্টিকের মাউস এবং তার":"An output device that makes sound loud for the whole class / একটি আউটপুট ডিভাইস যা পুরো ক্লাসের জন্য শব্দ তৈরি করে","Sliced Mangoes + Milk + Sugar / কাটা আম + দুধ + চিনি":"The raw 'Input' ingredients needed to build a shake / শেক তৈরি করার জন্য প্রয়োজনীয় প্রাথমিক 'ইনপুট' উপাদান","The CPU Cabinet / CPU ক্যাবিনেট":"The physical, heavy box acting as the computer's brain case / একটি ভারী ভৌত বাক্স যা কম্পিউটারের মস্তিষ্কের আধার হিসেবে কাজ করে","The Monitor / মনিটর (Monitor)":"A digital playground or program you can use but cannot touch / একটি ডিজিটাল খেলার জায়গা বা প্রোগ্রাম যা স্পর্শ করা যায় না","Speakers / স্পিকার (Speakers)":"The visual 'Soft Copy' screen showing what the system does / একটি ভিজ্যুয়াল 'সফট কপি' স্ক্রিন যা ভেতরের কাজগুলো দেখায়","Clean Clothes / পরিষ্কার কাপড়":"The final product or 'Output' after the wash cycle ends / ওয়াশ সাইকেল শেষ হওয়ার পরের চূড়ান্ত ফলাফল বা 'আউটপুট'","Car Racing Game / কার রেসিং গেম":"The physical 'body' parts of the machine you can touch / কম্পিউটারের ফিজিক্যাল 'শরীর'-এর অংশ যা তুমি স্পর্শ করতে পারো","Mouse Clicks / মাউস ক্লিক (Mouse Click)":"The long strip at the bottom showing currently running apps / নিচের লম্বা স্ট্রিপ যা বর্তমানে চলমান অ্যাপসগুলোকে দেখায়","The Taskbar / টাস্কবার (Taskbar)":"The 'Input' data fed by clicking to select items / ক্লিক করে আইটেম সিলেক্ট করার মাধ্যমে পাঠানো 'ইনপুট' ডেটা"}	f	4.00
df9b93cc-bd96-4fc8-b2b0-641df6dcb1d9	14edfa07-34b3-4b0f-b80d-1d62004168b1	{"Mouse Clicks / মাউস ক্লিক (Mouse Click)":"The 'Input' data fed by clicking to select items / ক্লিক করে আইটেম সিলেক্ট করার মাধ্যমে পাঠানো 'ইনপুট' ডেটা","Clean Clothes / পরিষ্কার কাপড়":"The final product or 'Output' after the wash cycle ends / ওয়াশ সাইকেল শেষ হওয়ার পরের চূড়ান্ত ফলাফল বা 'আউটপুট'","Speakers / স্পিকার (Speakers)":"An output device that makes sound loud for the whole class / একটি আউটপুট ডিভাইস যা পুরো ক্লাসের জন্য শব্দ তৈরি করে","The CPU Cabinet / CPU ক্যাবিনেট":"The physical, heavy box acting as the computer's brain case / একটি ভারী ভৌত বাক্স যা কম্পিউটারের মস্তিষ্কের আধার হিসেবে কাজ করে","The Monitor / মনিটর (Monitor)":"The visual 'Soft Copy' screen showing what the system does / একটি ভিজ্যুয়াল 'সফট কপি' স্ক্রিন যা ভেতরের কাজগুলো দেখায়","The Taskbar / টাস্কবার (Taskbar)":"The long strip at the bottom showing currently running apps / নিচের লম্বা স্ট্রিপ যা বর্তমানে চলমান অ্যাপসগুলোকে দেখায়","A Microphone / মাইক্রোফোন":"A hardware component acting like the computer's ear / একটি হার্ডওয়্যার অংশ যা কম্পিউটারের কানের মতো কাজ করে","Plastic Mouse and Wires / প্লাস্টিকের মাউস এবং তার":"The physical 'body' parts of the machine you can touch / কম্পিউটারের ফিজিক্যাল 'শরীর'-এর অংশ যা তুমি স্পর্শ করতে পারো","Sliced Mangoes + Milk + Sugar / কাটা আম + দুধ + চিনি":"The raw 'Input' ingredients needed to build a shake / শেক তৈরি করার জন্য প্রয়োজনীয় প্রাথমিক 'ইনপুট' উপাদান","Car Racing Game / কার রেসিং গেম":"A digital playground or program you can use but cannot touch / একটি ডিজিটাল খেলার জায়গা বা প্রোগ্রাম যা স্পর্শ করা যায় না"}	t	10.00
491e4671-6588-41ad-8fa8-f8073fd66d6d	14edfa07-34b3-4b0f-b80d-1d62004168b1	{"The CPU Cabinet / CPU ক্যাবিনেট":"The physical, heavy box acting as the computer's brain case / একটি ভারী ভৌত বাক্স যা কম্পিউটারের মস্তিষ্কের আধার হিসেবে কাজ করে","A Microphone / মাইক্রোফোন":"A hardware component acting like the computer's ear / একটি হার্ডওয়্যার অংশ যা কম্পিউটারের কানের মতো কাজ করে","Speakers / স্পিকার (Speakers)":"An output device that makes sound loud for the whole class / একটি আউটপুট ডিভাইস যা পুরো ক্লাসের জন্য শব্দ তৈরি করে","Sliced Mangoes + Milk + Sugar / কাটা আম + দুধ + চিনি":"The raw 'Input' ingredients needed to build a shake / শেক তৈরি করার জন্য প্রয়োজনীয় প্রাথমিক 'ইনপুট' উপাদান","Plastic Mouse and Wires / প্লাস্টিকের মাউস এবং তার":"The physical 'body' parts of the machine you can touch / কম্পিউটারের ফিজিক্যাল 'শরীর'-এর অংশ যা তুমি স্পর্শ করতে পারো","The Taskbar / টাস্কবার (Taskbar)":"The visual 'Soft Copy' screen showing what the system does / একটি ভিজ্যুয়াল 'সফট কপি' স্ক্রিন যা ভেতরের কাজগুলো দেখায়","Clean Clothes / পরিষ্কার কাপড়":"The final product or 'Output' after the wash cycle ends / ওয়াশ সাইকেল শেষ হওয়ার পরের চূড়ান্ত ফলাফল বা 'আউটপুট'","Car Racing Game / কার রেসিং গেম":"The 'Input' data fed by clicking to select items / ক্লিক করে আইটেম সিলেক্ট করার মাধ্যমে পাঠানো 'ইনপুট' ডেটা","The Monitor / মনিটর (Monitor)":"A digital playground or program you can use but cannot touch / একটি ডিজিটাল খেলার জায়গা বা প্রোগ্রাম যা স্পর্শ করা যায় না","Mouse Clicks / মাউস ক্লিক (Mouse Click)":"The long strip at the bottom showing currently running apps / নিচের লম্বা স্ট্রিপ যা বর্তমানে চলমান অ্যাপসগুলোকে দেখায়"}	f	6.00
da260c91-075f-4b69-9e4f-21e38e225b15	14edfa07-34b3-4b0f-b80d-1d62004168b1	{"The Monitor / মনিটর (Monitor)":"The physical 'body' parts of the machine you can touch / কম্পিউটারের ফিজিক্যাল 'শরীর'-এর অংশ যা তুমি স্পর্শ করতে পারো","The CPU Cabinet / CPU ক্যাবিনেট":"The physical, heavy box acting as the computer's brain case / একটি ভারী ভৌত বাক্স যা কম্পিউটারের মস্তিষ্কের আধার হিসেবে কাজ করে","Speakers / স্পিকার (Speakers)":"An output device that makes sound loud for the whole class / একটি আউটপুট ডিভাইস যা পুরো ক্লাসের জন্য শব্দ তৈরি করে","A Microphone / মাইক্রোফোন":"A hardware component acting like the computer's ear / একটি হার্ডওয়্যার অংশ যা কম্পিউটারের কানের মতো কাজ করে","Car Racing Game / কার রেসিং গেম":"The long strip at the bottom showing currently running apps / নিচের লম্বা স্ট্রিপ যা বর্তমানে চলমান অ্যাপসগুলোকে দেখায়","Plastic Mouse and Wires / প্লাস্টিকের মাউস এবং তার":"The final product or 'Output' after the wash cycle ends / ওয়াশ সাইকেল শেষ হওয়ার পরের চূড়ান্ত ফলাফল বা 'আউটপুট'","Sliced Mangoes + Milk + Sugar / কাটা আম + দুধ + চিনি":"The raw 'Input' ingredients needed to build a shake / শেক তৈরি করার জন্য প্রয়োজনীয় প্রাথমিক 'ইনপুট' উপাদান","Mouse Clicks / মাউস ক্লিক (Mouse Click)":"The 'Input' data fed by clicking to select items / ক্লিক করে আইটেম সিলেক্ট করার মাধ্যমে পাঠানো 'ইনপুট' ডেটা","The Taskbar / টাস্কবার (Taskbar)":"A digital playground or program you can use but cannot touch / একটি ডিজিটাল খেলার জায়গা বা প্রোগ্রাম যা স্পর্শ করা যায় না","Clean Clothes / পরিষ্কার কাপড়":"The visual 'Soft Copy' screen showing what the system does / একটি ভিজ্যুয়াল 'সফট কপি' স্ক্রিন যা ভেতরের কাজগুলো দেখায়"}	f	5.00
da260c91-075f-4b69-9e4f-21e38e225b15	02a22274-6e49-43d8-b157-6f9d9f5fa18d	Because it can do many different tasks like drawing, math, and music at the same time. / কারণ এটি একই সাথে ছবি আঁকা, অঙ্ক করা এবং গান চালানোর মতো অনেক রকমের কাজ করতে পারে।	t	1.00
\.


--
-- Data for Name: students; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.students (student_id, name, phone_no, class, batch) FROM stdin;
128	Raj Sen	1234567897	Class 5	V,VI,VII Batch -2
068	Argha Das	1296585255	Class 7	V,VI,VII Batch -2
071	Shrijib Debnath	2985656985	Class 6	V,VI,VII Batch -2
090	Chinmoyee Bhabak	5862556526	Class 6	V,VI,VII Batch -2
067	Aritra Das	8659212525	Class 6	V,VI,VII Batch -2
060	Samadhan Day	56653652121	Class 5	V,VI,VII Batch -2
065	Sayan Mandal	5465265825	Class 5	V,VI,VII Batch -2
091	Aditri Sadhukhan	8472358924	Class 6	V,VI,VII Batch -2
124	Ashis Mondal	5656815326	Class 6	V,VI,VII Batch -2
069	Trishan Biswas	15326523252	Class 6	V,VI,VII Batch -2
106	Rudranil Das	54563665623	Class 6	V,VI,VII Batch -2
141	Nilay Sammadar	65652	Class 6	V,VI,VII Batch -2
140	Ayush Mistry	5256235626	Class 5	V,VI,VII Batch -2
050	Sundharam Biswas	123456789	Class 5	V,VI Batch 1
127	Arijit Dey	12345678	Class 5	V,VI Batch 1
052	Ishan Mondal	123456789	Class 6	V,VI Batch 1
125	Rishab Sarkar	123456789	Class 5	V,VI Batch 1
037	Sayantika Raha	123456789	Class 6	V,VI Batch 1
055	Priyom Adhikari	123456789	Class 5	V,VI Batch 1
062	Shreyan Debnath	1234567879	Class 5	V,VI Batch 1
063	Arnab Biswas	1234567	Class 5	V,VI Batch 1
129	Argo Malllick	123456789	Class 5	V,VI Batch 1
142	Devraj Roy	1234567	Class 5	V,VI Batch 1
057	Bir Debnath	7864094440	Class 9	VII,VIII,IX Batch 2
056	Sandip Sarkar	8653008805	Class 7	VII,VIII,IX Batch 2
049	Tamojit Bala	9932987585	Class 7	VII,VIII,IX Batch 2
040	Ankit Golder	9144989302	Class 8	VII,VIII,IX Batch 2
041	Samiran Majumder	7478667845	Class 8	VII,VIII,IX Batch 2
061	Anirudra Das	9134873102	Class 7	VII,VIII,IX Batch 2
066	Diya Adhikary	7076516613	Class 7	VII,VIII,IX Batch 2
073	DHRUB BAKCHI	7479396209	Class 7	VII,VIII,IX Batch 2
113	Riman Das	9564370203	Class 8	VII,VIII,IX Batch 2
123	Suharta Sarkar	9732142794	Class 7	VII,VIII,IX Batch 2
138	Diya Biswas	8001431755	Class 7	VII,VIII,IX Batch 2
145	Rittika Ray	8918146818	Class 7	VII,VIII,IX Batch 2
039	Rihan Biswas	9609907199	Class 4	KIDS III, IV, V
130	Ishika Naskar	9874443234	Class 3	KIDS III, IV, V
119	Tulika Mondal	9593084604	Class 3	KIDS III, IV, V
133	Progya Biswas	9641358033	Class 4	KIDS III, IV, V
\.


--
-- Name: download_audit_logs download_audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.download_audit_logs
    ADD CONSTRAINT download_audit_logs_pkey PRIMARY KEY (log_id);


--
-- Name: exam_sections exam_sections_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.exam_sections
    ADD CONSTRAINT exam_sections_pkey PRIMARY KEY (section_id);


--
-- Name: exam_sessions exam_sessions_exam_id_student_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.exam_sessions
    ADD CONSTRAINT exam_sessions_exam_id_student_id_key UNIQUE (exam_id, student_id);


--
-- Name: exam_sessions exam_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.exam_sessions
    ADD CONSTRAINT exam_sessions_pkey PRIMARY KEY (session_id);


--
-- Name: exams exams_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.exams
    ADD CONSTRAINT exams_pkey PRIMARY KEY (exam_id);


--
-- Name: questions questions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.questions
    ADD CONSTRAINT questions_pkey PRIMARY KEY (question_id);


--
-- Name: student_responses student_responses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_responses
    ADD CONSTRAINT student_responses_pkey PRIMARY KEY (session_id, question_id);


--
-- Name: students students_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_pkey PRIMARY KEY (student_id);


--
-- Name: exam_sections exam_sections_exam_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.exam_sections
    ADD CONSTRAINT exam_sections_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES public.exams(exam_id) ON DELETE CASCADE;


--
-- Name: exam_sessions exam_sessions_exam_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.exam_sessions
    ADD CONSTRAINT exam_sessions_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES public.exams(exam_id) ON DELETE CASCADE;


--
-- Name: exam_sessions exam_sessions_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.exam_sessions
    ADD CONSTRAINT exam_sessions_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(student_id) ON DELETE CASCADE;


--
-- Name: questions questions_exam_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.questions
    ADD CONSTRAINT questions_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES public.exams(exam_id) ON DELETE CASCADE;


--
-- Name: questions questions_section_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.questions
    ADD CONSTRAINT questions_section_id_fkey FOREIGN KEY (section_id) REFERENCES public.exam_sections(section_id) ON DELETE CASCADE;


--
-- Name: student_responses student_responses_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_responses
    ADD CONSTRAINT student_responses_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.questions(question_id) ON DELETE CASCADE;


--
-- Name: student_responses student_responses_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_responses
    ADD CONSTRAINT student_responses_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.exam_sessions(session_id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict S1O1YumOJYXyGshogzFho1HdF21sr7P0IceTry9afjeaxxiwPolPbtdvEENdLVp

