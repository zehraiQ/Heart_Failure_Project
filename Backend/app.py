import os
import sqlite3
import joblib
import numpy as np
import pydantic
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

# ==========================================
# 1. Dinamik Yolların Ayarlanması (Paths)
# ==========================================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PARENT_DIR = os.path.dirname(BASE_DIR)

# Modeller Backend klasörü içinde yer alıyor
MODELS_DIR = os.path.join(BASE_DIR, "models")
# Veritabanı ve Frontend klasörleri Backend'in dışında (bir üst dizinde)
DATABASE_DIR = os.path.join(PARENT_DIR, "Database") 
FRONTEND_DIR = os.path.join(PARENT_DIR, "Frontend")

app = FastAPI(title="Heart Failure Prediction API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# 2. Modellerin Yüklenmesi
# ==========================================
try:
    scaler = joblib.load(os.path.join(MODELS_DIR, "scaler.pkl"))
    dt_model = joblib.load(os.path.join(MODELS_DIR, "decision_tree_model.pkl"))
    knn_model = joblib.load(os.path.join(MODELS_DIR, "knn_model.pkl"))
    nb_model = joblib.load(os.path.join(MODELS_DIR, "naive_bayes_model.pkl"))
    rf_model = joblib.load(os.path.join(MODELS_DIR, "random_forest_model.pkl"))
    print("✅ Tüm modeller ve Scaler başarıyla yüklendi!")
except Exception as e:
    print(f"❌ Modeller yüklenirken hata oluştu: {e}")

# ==========================================
# 3. Hasta Veri Modelinin (Pydantic) Ayarlanması
# ==========================================
class PatientData(pydantic.BaseModel):
    age: float
    anaemia: int
    creatinine_phosphokinase: int
    diabetes: int
    ejection_fraction: int
    high_blood_pressure: int
    platelets: float
    serum_creatinine: float
    serum_sodium: int
    sex: int
    smoking: int
    time: int

# ==========================================
# 4. Veri Ön İşleme (Preprocess) Fonksiyonu
# ==========================================
def preprocess_data(raw_features: list):
    """
    Kullanıcıdan gelen ham veriyi alır ve modellerin 
    anlayabileceği şekilde Scaler'dan geçirir.
    """
    input_data = np.array(raw_features).reshape(1, -1)
    scaled_data = scaler.transform(input_data)
    return scaled_data

# ==========================================
# 5. Tahmin Yapma ve Veritabanına Kaydetme (Routes)
# ==========================================
@app.post("/predict")
def make_prediction(data: PatientData):
    try:
        # Gelen verileri doğru sırayla bir listeye yerleştir
        raw_features = [
            data.age, data.anaemia, data.creatinine_phosphokinase, data.diabetes,
            data.ejection_fraction, data.high_blood_pressure, data.platelets,
            data.serum_creatinine, data.serum_sodium, data.sex, data.smoking, data.time
        ]
        
        # Veriyi işle ve hazırlığını yap
        processed_data = preprocess_data(raw_features)
        
        # Tahminleri yap
        dt_pred = int(dt_model.predict(processed_data)[0])
        knn_pred = int(knn_model.predict(processed_data)[0])
        nb_pred = int(nb_model.predict(processed_data)[0])
        rf_pred = int(rf_model.predict(processed_data)[0])
        
        # ============================================================
        # VERİTABANINA KAYIT İŞLEMİ
        # ============================================================
        try:
            db_path = os.path.join(DATABASE_DIR, "HeartFailure_DB.db")
            with sqlite3.connect(db_path) as conn:
                cursor = conn.cursor()
                all_values = raw_features + [rf_pred]
                cursor.execute('''
                    INSERT INTO heart_failure_records 
                    (age, anaemia, creatinine_phosphokinase, diabetes, ejection_fraction, 
                     high_blood_pressure, platelets, serum_creatinine, serum_sodium, 
                     sex, smoking, time, DEATH_EVENT)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', all_values)
                conn.commit()
                print("✅ Veri başarıyla veritabanına kaydedildi.")
        except Exception as db_error:
            print(f"⚠️ Veritabanı kayıt hatası: {db_error}")
        # ============================================================
            
        return {
           "status": "success",
            "decision_tree": dt_pred,
            "knn": knn_pred,
            "naive_bayes": nb_pred,
            "random_forest": rf_pred
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Tahmin yapılırken hata oluştu: {str(e)}")

# ==========================================
# 6. Kullanıcı Arayüzü (Frontend) Bağlantısı
# ==========================================
# Not: "/" yolu artık Frontend sitesini göstermek için ayrılmıştır.
app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="Frontend")
